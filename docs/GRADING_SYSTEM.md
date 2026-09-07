# Grading system

User-facing grading types are exactly Percentage, Letter Grade, Pass / Fail, and Custom / Other.

- Percentage accepts exact numeric standing and uses the course's snapshotted scale. Default: A 90+, B 80+, C 70+, D 60+, F below 60.
- Letter supports A/B/C/D/F now; storage permits future plus/minus values without redesign.
- Pass / Fail records the reported result and is excluded from estimated GPA by default.
- Custom / Other stores the grading description and standing. It is excluded until Chair/Admin review selects Exclude, Treat as Pass/Fail, or a reliable custom conversion.

The default calculation is credit-hour weighted: sum of `grade points * credit hours` divided by included credit hours. Equal-course weighting is an administrative alternative. Archived courses do not enter new submissions. Missing or uninterpretable grades do not contribute. The UI always says `Estimated [Semester Name] GPA`, states the number of included active courses, and shows the official-GPA disclaimer.

Each submission revision snapshots course name, credits, grading type, scale/conversion, inclusion, and calculated points. Later course or default-scale changes cannot alter history.
