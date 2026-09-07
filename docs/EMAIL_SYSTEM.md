# Email system

Resend delivers application email. Development defaults to safe/mock mode. Sender, reply-to, webhook secret, and API key are environment/configuration concerns; secrets never reach browser code.

Bulk operational email is prepared but never sent without Admin/Chair review and approval. The workflow supports batch-wide edits, per-recipient edits, preview, failed-message review, and retry without duplicate delivery. Academic grade-change alerts may send automatically to the Chair, contain only the member name and a secure-review link, and never contain exact grades.

Editable templates support a strict allowlist such as `memberName`, `semesterName`, `weekLabel`, `requiredHours`, `completedHours`, `remainingHours`, and `deadline`. Unknown tokens fail validation. Each `email_message` stores the final recipient, subject, and body actually sent, approver, send time, provider ID, and delivery state. An idempotency key prevents duplicate sends. Verified Resend webhooks append delivery events and update derived message state.
