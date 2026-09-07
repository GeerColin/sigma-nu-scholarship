# Study-hour system

Recommended initial base rules: 3.50–4.00 -> 1 hour; 3.00–3.49 -> 1; 2.75–2.99 -> 2; 2.50–2.74 -> 2; 2.25–2.49 -> 3; 2.00–2.24 -> 4; below 2.00 -> 5. Add 1 hour for any D, or 2 for any F; use the strongest adjustment rather than stacking. Cap the result at the configured maximum of 5.

Rules are immutable versioned sets. Every assignment stores the GPA and risk facts used, rule-set version, automatic hours, optional override, final hours, status, and finalization state.

Before email approval/send, recalculation may update an assignment. Sending freezes it. A later grade change that would alter hours creates a Chair review state with Keep Existing or Update Assignment; neither outcome happens silently.

Only Admin/Chair may override. A nonempty reason and explicit confirmation are required. Removing an override is audited and restores the appropriate automatic calculation. Members see only final required hours.

Sessions store integer minutes. Proctors may create sessions for active names and edit their own current-week sessions. Old-week corrections require Admin/Chair and all changes are audited.
