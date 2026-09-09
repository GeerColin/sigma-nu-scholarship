"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  editEmailBatchSchema,
  editEmailMessageSchema,
  emailBatchIdSchema,
  prepareEmailBatchSchema,
} from "@/features/email/validation";
import { requireChairContext } from "@/lib/auth/guards";
import {
  renderEmailTemplate,
  type EmailTemplateContext,
} from "@/lib/email/templates";
import { createEmailTransport } from "@/lib/email/transport";
import { createClient } from "@/lib/supabase/server";

const emailPath = "/email";

export async function prepareEmailBatch(formData: FormData) {
  await requireChairContext();
  const parsed = prepareEmailBatchSchema.safeParse({
    weekId: formData.get("weekId"),
    batchType: formData.get("batchType"),
  });
  if (!parsed.success) redirect(`${emailPath}?error=invalid-batch` as never);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("prepare_email_batch", {
    target_week_id: parsed.data.weekId,
    requested_batch_type: parsed.data.batchType,
  });
  if (error || !data) redirect(`${emailPath}?error=no-recipients` as never);

  const { data: activeTemplate, error: templateError } = await supabase
    .from("email_templates")
    .select("subject_template, body_template")
    .eq("template_type", parsed.data.batchType)
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (templateError)
    redirect(`${emailPath}?error=template-not-loaded` as never);
  if (activeTemplate) {
    const { data: preparedMessages, error: preparedError } = await supabase
      .from("email_messages")
      .select("id, template_context")
      .eq("batch_id", data)
      .eq("state", "draft");
    if (preparedError || !preparedMessages?.length) {
      redirect(`${emailPath}?error=template-not-applied` as never);
    }
    let updates;
    try {
      updates = preparedMessages.map((message) => ({
        id: message.id,
        ...renderEmailTemplate(
          {
            subject: activeTemplate.subject_template,
            body: activeTemplate.body_template,
          },
          message.template_context as EmailTemplateContext,
        ),
      }));
    } catch {
      redirect(`${emailPath}?error=template-not-applied` as never);
    }
    const { error: replaceError } = await supabase.rpc(
      "replace_email_batch_messages",
      { target_batch_id: data, message_updates: updates },
    );
    if (replaceError) {
      redirect(`${emailPath}?error=template-not-applied` as never);
    }
  }
  revalidatePath(emailPath);
  revalidatePath("/");
  redirect(`${emailPath}?status=prepared&batch=${data}` as never);
}

export async function editEmailBatch(formData: FormData) {
  await requireChairContext();
  const parsed = editEmailBatchSchema.safeParse({
    batchId: formData.get("batchId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) redirect(`${emailPath}?error=invalid-template` as never);

  const supabase = await createClient();
  const { data: messages, error: messageError } = await supabase
    .from("email_messages")
    .select("id, template_context")
    .eq("batch_id", parsed.data.batchId)
    .eq("state", "draft");
  if (messageError || !messages?.length)
    redirect(`${emailPath}?error=batch-not-editable` as never);

  let updates: Array<{ id: string; subject: string; body: string }>;
  try {
    updates = messages.map((message) => ({
      id: message.id,
      ...renderEmailTemplate(
        { subject: parsed.data.subject, body: parsed.data.body },
        message.template_context as EmailTemplateContext,
      ),
    }));
  } catch {
    redirect(`${emailPath}?error=missing-template-value` as never);
  }

  const { error } = await supabase.rpc("replace_email_batch_messages", {
    target_batch_id: parsed.data.batchId,
    message_updates: updates,
  });
  if (error) redirect(`${emailPath}?error=batch-not-editable` as never);
  revalidatePath(emailPath);
  redirect(`${emailPath}?status=batch-edited` as never);
}

export async function editEmailMessage(formData: FormData) {
  await requireChairContext();
  const parsed = editEmailMessageSchema.safeParse({
    messageId: formData.get("messageId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    selected: formData.get("selected") === "on",
  });
  if (!parsed.success) redirect(`${emailPath}?error=invalid-message` as never);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_email_message", {
    target_message_id: parsed.data.messageId,
    new_subject: parsed.data.subject,
    new_body: parsed.data.body,
    is_selected: parsed.data.selected,
  });
  if (error) redirect(`${emailPath}?error=message-not-editable` as never);
  revalidatePath(emailPath);
  redirect(`${emailPath}?status=message-edited` as never);
}

export async function approveEmailBatch(formData: FormData) {
  await requireChairContext();
  const parsed = emailBatchIdSchema.safeParse({
    batchId: formData.get("batchId"),
  });
  if (!parsed.success) redirect(`${emailPath}?error=invalid-batch` as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_email_batch", {
    target_batch_id: parsed.data.batchId,
  });
  if (error) redirect(`${emailPath}?error=batch-not-approved` as never);
  revalidatePath(emailPath);
  redirect(`${emailPath}?status=approved` as never);
}

export async function sendApprovedEmailBatch(formData: FormData) {
  await requireChairContext();
  const parsed = emailBatchIdSchema.safeParse({
    batchId: formData.get("batchId"),
  });
  if (!parsed.success) redirect(`${emailPath}?error=invalid-batch` as never);

  await deliverEmailBatch(parsed.data.batchId, false);
  revalidatePath(emailPath);
  revalidatePath("/");
  redirect(`${emailPath}?status=sent` as never);
}

export async function retryFailedEmailBatch(formData: FormData) {
  await requireChairContext();
  const parsed = emailBatchIdSchema.safeParse({
    batchId: formData.get("batchId"),
  });
  if (!parsed.success) redirect(`${emailPath}?error=invalid-batch` as never);

  await deliverEmailBatch(parsed.data.batchId, true);
  revalidatePath(emailPath);
  revalidatePath("/");
  redirect(`${emailPath}?status=retried` as never);
}

async function deliverEmailBatch(batchId: string, retry: boolean) {
  const context = await requireChairContext();

  const supabase = await createClient();
  const { data: settings, error: settingsError } = await supabase
    .from("chapter_settings")
    .select("email_from, email_reply_to")
    .eq("chapter_id", context.chapterId!)
    .maybeSingle();
  const from = settings?.email_from || process.env.EMAIL_FROM;
  if (settingsError || !from)
    redirect(`${emailPath}?error=batch-not-sendable` as never);

  const { error: beginError } = await supabase.rpc(
    retry ? "begin_email_batch_retry" : "begin_email_batch_send",
    { target_batch_id: batchId },
  );
  if (beginError) redirect(`${emailPath}?error=batch-not-sendable` as never);

  const { data: messages, error: messageError } = await supabase
    .from("email_messages")
    .select("id, recipient_email, final_subject, final_body, idempotency_key")
    .eq("batch_id", batchId)
    .eq("selected", true)
    .eq("state", "queued");
  if (messageError || !messages?.length)
    redirect(`${emailPath}?error=batch-not-sendable` as never);

  const transport = createEmailTransport();
  for (const message of messages) {
    try {
      const result = await transport.send({
        from,
        replyTo: settings?.email_reply_to || process.env.EMAIL_REPLY_TO,
        to: message.recipient_email,
        subject: message.final_subject,
        text: message.final_body,
        idempotencyKey: message.idempotency_key,
      });
      await supabase.rpc("record_email_send_result_v2", {
        target_message_id: message.id,
        provider_id: result.providerMessageId,
        succeeded: true,
        failure_code: "",
      });
    } catch {
      await supabase.rpc("record_email_send_result_v2", {
        target_message_id: message.id,
        provider_id: "",
        succeeded: false,
        failure_code: "transport_error",
      });
    }
  }
}
