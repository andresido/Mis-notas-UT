Run instructions

Preview locally
- Serve the folder with a static server and open `index.html` in a browser. Examples:

```bash
npx http-server . -p 8080
# or
npx live-server .
```

Firebase notes
- To create the initial admin (`andresido`) safely, use Firebase Admin SDK or a Cloud Function that runs with admin privileges. From a trusted environment run a script similar to:

```js
// Node.js (requires firebase-admin credentials)
const admin = require('firebase-admin');
admin.auth().createUser({email: 'andresido@yourdomain', password: 'SOME_SECURE_PASSWORD'})
  .then(user => admin.firestore().collection('users').doc(user.uid).set({uid: user.uid, email: user.email, role: 'admin', createdAt: new Date().toISOString()}));
```

- The client-side app includes a registration flow that creates regular users via `createUserWithEmailAndPassword`.
- Configure Firestore rules to allow users to read/write only their `userdata/{uid}` and allow admins to read other users' `userdata`.
 - Deploy Cloud Function (recommended) to create admin securely. From the project root:

```bash
# install deps for functions
cd functions
npm install

# set secret used by the function (replace SECRET_VALUE). Requires Firebase CLI and project initialized:
firebase functions:config:set admin.secret="SECRET_VALUE"

# Deploy only the function
firebase deploy --only functions:createAdmin
```

Then call the function (from a secure environment) to create the admin:

```bash
curl -X POST https://REGION-PROJECT.cloudfunctions.net/createAdmin -d "email=andresido@yourdomain&password=YOUR_PASSWORD&secret=SECRET_VALUE"
```

Finally, set the admin's email to `andresido@yourdomain` (or your chosen email) and use that account to sign in.
