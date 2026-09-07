# Roles and permissions

Permissions are chapter-scoped and enforced by PostgreSQL RLS plus trusted server checks.

| Capability                      | Member | Proctor |  Admin | Chair |
| ------------------------------- | -----: | ------: | -----: | ----: |
| Own academic records            |    Yes |     Yes |    Yes |   Yes |
| Active member names for logging |     No |     Yes |    Yes |   Yes |
| Other members' grades/GPA       |     No |      No |    Yes |   Yes |
| Log study sessions              |     No |     Yes |    Yes |   Yes |
| Edit own current-week session   |     No |     Yes |    Yes |   Yes |
| Correct old sessions            |     No |      No |    Yes |   Yes |
| Approve account links           |     No |      No |    Yes |   Yes |
| Override study hours            |     No |      No |    Yes |   Yes |
| Assign/remove Proctors          |     No |      No |    Yes |   Yes |
| Assign/remove Admins            |     No |      No |     No |   Yes |
| Transfer Chair                  |     No |      No |     No |   Yes |
| View audit log/export           |     No |      No | Scoped |   Yes |

Unauthenticated and awaiting-approval identities have no chapter-record access. Access-request screens never expose the roster. Disconnecting a Google identity removes the link, not the member or academic history.

Exactly one active Chair is maintained with transactional database functions and constraints. A Chair cannot remove their own Chair role; only successful handoff can transfer it.
