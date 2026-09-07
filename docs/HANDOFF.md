# Scholarship Chair handoff

The Chair opens Administration -> Start Scholarship Chair Handoff.

1. Select an Active successor with a linked Google account.
2. Verify successor and chapter.
3. Review readiness: semester, deadlines, versioned rules, email, active roster, and a recovery-capable administrator.
4. Choose the outgoing Chair's permitted lower-level roles.
5. Review the transfer.
6. Confirm an atomic database operation that removes the outgoing Chair role, adds the successor Chair role, preserves allowed lower roles, and appends an audit event.

The transaction fails as a whole if any invariant is violated. The database must never expose zero or multiple active Chairs. Only the current Chair can invoke the function.

The new Chair receives brief onboarding explaining Dashboard attention items, member submissions, automatic study-hour calculation, reviewed email, and Settings. The in-app Scholarship Chair Guide remains available.

Infrastructure ownership should be chapter/organization controlled with at least two trusted recovery-capable people for GitHub, Vercel, Supabase, Google OAuth, Resend, and domain/DNS accounts.
