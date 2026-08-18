# Santri Account Linking for Admin Users

## Goal

Allow admin to create an Orang Tua account for an existing santri from the Users page, linking the new user to the santri so the parent dashboard shows the child's data.

## Design

- In the Users dialog, when Role = "Orang Tua", show a "Santri" select listing santris that do not yet have an orang tua account.
- Selecting a santri auto-fills Username with a normalized form of the santri's name (lowercase, spaces become dots, e.g. "Aisyah Putri" → "aisyah.putri"). Admin can still edit it.
- On save: create auth user, insert `users` row (role ORANG_TUA), then insert `orang_tuas` row (user_id, santri_id). Failures roll back cleanly.
- Validation: role ORANG_TUA requires a selected santri.
- On edit of an ORANG_TUA user: show the linked santri as read-only.
- On delete: remove the `orang_tuas` link first (FK restrict), then users row, then auth user.
- Users list shows a "Terhubung" column displaying the linked santri name for ORANG_TUA users.
