import "server-only";

import { Resend, type WebhookEventPayload } from "resend";

export function verifyResendWebhook({
  payload,
  id,
  timestamp,
  signature,
  secret,
}: {
  payload: string;
  id: string;
  timestamp: string;
  signature: string;
  secret: string;
}): WebhookEventPayload {
  return new Resend().webhooks.verify({
    payload,
    headers: { id, timestamp, signature },
    webhookSecret: secret,
  });
}

export function isEmailWebhookEvent(
  event: WebhookEventPayload,
): event is WebhookEventPayload & { data: { email_id: string } } {
  return event.type.startsWith("email.") && "email_id" in event.data;
}
