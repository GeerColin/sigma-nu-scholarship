import { isEmailWebhookEvent, verifyResendWebhook } from "@/lib/email/webhook";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!secret) {
    return Response.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  }
  if (!id || !timestamp || !signature) {
    return Response.json(
      { error: "Missing signature headers." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  let event;
  try {
    event = verifyResendWebhook({ payload, id, timestamp, signature, secret });
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }
  if (!isEmailWebhookEvent(event)) {
    return Response.json({ received: true, ignored: true });
  }

  try {
    const supabase = createPrivilegedClient();
    const { data, error } = await supabase.rpc("record_email_delivery_event", {
      provider_event_id: id,
      event_type: event.type,
      provider_message_id: event.data.email_id,
      event_payload: event,
      event_occurred_at: event.created_at,
    });
    if (error) throw error;
    return Response.json({ received: true, result: data });
  } catch {
    return Response.json(
      { error: "Webhook could not be recorded." },
      { status: 500 },
    );
  }
}
