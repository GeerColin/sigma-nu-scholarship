import "server-only";

import { Resend } from "resend";

export type OutboundEmail = {
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};
export type EmailSendResult = {
  providerMessageId: string;
  mode: "mock" | "resend";
};

export interface EmailTransport {
  send(message: OutboundEmail): Promise<EmailSendResult>;
}

export class MockEmailTransport implements EmailTransport {
  async send(message: OutboundEmail): Promise<EmailSendResult> {
    return {
      providerMessageId: `mock_${message.idempotencyKey}`,
      mode: "mock",
    };
  }
}

export class ResendEmailTransport implements EmailTransport {
  constructor(private readonly resend: Resend) {}

  async send(message: OutboundEmail): Promise<EmailSendResult> {
    const { data, error } = await this.resend.emails.send(
      {
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        replyTo: message.replyTo,
      },
      { idempotencyKey: message.idempotencyKey },
    );
    if (error || !data?.id)
      throw new Error("Email provider did not accept the message.");
    return { providerMessageId: data.id, mode: "resend" };
  }
}

export function createEmailTransport(): EmailTransport {
  if (process.env.EMAIL_MODE !== "production") return new MockEmailTransport();
  if (!process.env.RESEND_API_KEY) throw new Error("Resend is not configured.");
  return new ResendEmailTransport(new Resend(process.env.RESEND_API_KEY));
}
