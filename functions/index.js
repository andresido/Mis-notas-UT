const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// HTTP function to create the admin user and set custom claim 'admin'
// Protect this function: call it from a secure environment or set a secret.
exports.createAdmin = functions.https.onRequest(async (req, res) => {
  try {
    // Simple shared-secret check (replace with proper secret manager)
    const SECRET = functions.config().admin && functions.config().admin.secret;
    const provided = req.body && req.body.secret || req.query.secret;
    if (!SECRET || provided !== SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const email = req.body.email || req.query.email;
    const password = req.body.password || req.query.password;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    // Create user if not exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      userRecord = await admin.auth().createUser({ email, password });
    }

    // Set custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });

    // Ensure users/{uid} profile exists
    const profileRef = db.collection('users').doc(userRecord.uid);
    await profileRef.set({ uid: userRecord.uid, email: userRecord.email, role: 'admin', createdAt: new Date().toISOString() }, { merge: true });

    return res.json({ success: true, uid: userRecord.uid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});
