# Email system

Resend delivers application email. Development defaults to safe/mock mode. Sender, reply-to, webhook secret, and API key are environment/configuration concerns; secrets never reach browser code.

Bulk operational email is prepared but never sent without Admin/Chair review and approval. The workflow supports batch-wide edits, per-recipient edits, preview, failed-message review, and retry without duplicate delivery. Academic grade-change alerts may send automatically to the Chair, contain only the member name and a secure-review link, and never contain exact grades.

Editable templates support a strict allowlist such as `memberName`, `semesterName`, `weekLabel`, `requiredHours`, `completedHours`, `remainingHours`, and `deadline`. Unknown tokens fail validation. Each `email_message` stores the final recipient, subject, and body actually sent, send time, provider ID, attempt count, sanitized last failure, and delivery state. Approval is stored on the parent batch. The same provider idempotency key is retained when a failed message is retried, protecting ambiguous network failures from duplicate delivery.

Active templates are versioned in Supabase. Saving a template deactivates the prior version without rewriting previously prepared messages. New batches render the active template into each recipient's exact stored subject/body; the draft can still be edited before approval.

Resend sends signed events to `/api/webhooks/resend`. The route requires all three Svix signature headers and verifies the raw request body before creating the narrowly scoped server-only privileged Supabase client. The database recorder is executable only by `service_role`, ignores unknown provider message IDs, deduplicates `provider_event_id`, appends delivery history, and derives delivered/bounced/failed message and batch states.
