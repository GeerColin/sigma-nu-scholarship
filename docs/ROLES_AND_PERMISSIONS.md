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

## Recurring proctor schedule

| Schedule capability                                | Member | Proctor |                             Admin |                             Chair |
| -------------------------------------------------- | -----: | ------: | --------------------------------: | --------------------------------: |
| View approved chapter schedule                     |    Yes |     Yes |                               Yes |                               Yes |
| Create/edit/remove recurring sessions              |     No |      No |                               Yes |                               Yes |
| Create dated override/cancellation                 |     No |      No |                               Yes |                               Yes |
| Edit an assigned future occurrence's time/location |     No |     Yes | No (unless assigned as a Proctor) | No (unless assigned as a Proctor) |
| Read schedule-change notifications                 |     No |      No |                                No |                               Yes |

Recurring edits affect future dates without rewriting past occurrences. Dated exceptions remain attached to their occurrence; removing a series writes explicit future cancellations. Proctor edits are limited to an assigned future/current occurrence and create an audit record plus Chair notification in one database transaction.
