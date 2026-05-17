AGENTS - UT Académico

Purpose
- Quick instructions for AI coding agents to work on this small client-side app.

Project summary
- Single-page client app in `index.html` using Firebase (Auth + Firestore) for authentication and data storage.
- Users: email/password via Firebase Authentication. Profiles stored in `users/{uid}`. Per-user notes stored in `userdata/{uid}`.

Important notes
- The Firebase config keys are present in `index.html`. These are client keys (not secret) but service rules must be configured in the Firebase console.
- Admin user (`andresido`) must be created and assigned `role: 'admin'` in `users/{uid}`. Creating admin accounts requires Admin SDK or Cloud Function; see `skills/run.md` for suggested steps.

Where to look
- Main app: [index.html](index.html)
- Admin panel: inside `index.html` (search for "Panel de Administración")

What agents should do first
- Review `index.html` for Auth and Firestore usage before modifying data flows.
- Avoid embedding secrets; suggest moving sensitive initialization to environment or Cloud Functions.

Security
- Firestore rules are required to limit writes: users should write only their `userdata/{uid}` and only admins may read others' `userdata`.
 - Firestore rules are required to limit writes: users should write only their `userdata/{uid}` and only admins may read others' `userdata`. See `firestore.rules` (added).
 - A Cloud Function `createAdmin` is provided in `functions/index.js` to create the `andresido` admin and set the `admin` custom claim. Deploy via `firebase deploy --only functions:createAdmin` and set `admin.secret` with `firebase functions:config:set` before calling it.

Next suggested customizations
- Add `firestore.rules` and provide a Cloud Function to create admin users securely.
- Split `index.html` into modules for maintainability.
