const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Read admin password from environment as fallback (avoid functions.config usage)
const getAdminPassword = () => process.env.ADMIN_PASSWORD || 'volants2026';

exports.adminUpdate = functions.https.onCall(async (data, context) => {
  const { password, type, payload } = data || {};

  // Allow request if caller is authenticated and has custom claim `admin: true`.
  const callerIsAdmin = !!(context.auth && context.auth.token && context.auth.token.admin === true);

  // Fallback: allow if a correct admin password is provided (use env var)
  const ADMIN_PASSWORD = getAdminPassword();
  const passwordValid = password && password === ADMIN_PASSWORD;

  if (!callerIsAdmin && !passwordValid) {
    throw new functions.https.HttpsError('permission-denied', 'Accès administrateur requis');
  }

  const db = admin.firestore();

  try {
    if (type === 'voteConfig') {
      const newConfig = payload;
      await db.doc('siteConfig/voteConfig').set(newConfig, { merge: true });

      if (newConfig.votingEnabled) {
        // The app stores notification signups in 'voter_notifications'
        const snaps = await db.collection('voter_notifications').get();
        let success = 0;
        let failed = 0;
        for (const doc of snaps.docs) {
          try {
            await db.collection('sentNotifications').add({ ...doc.data(), sentAt: admin.firestore.FieldValue.serverTimestamp(), type: 'vote_opened' });
            success++;
          } catch (e) {
            failed++;
          }
        }
        return { updated: true, notifications: { success, failed } };
      }

      return { updated: true };
    }

    if (type === 'content') {
      // payload: { docId, data }
      const { docId, data } = payload || {};
      if (!docId || !data) throw new functions.https.HttpsError('invalid-argument', 'docId and data required');
      await db.doc(`siteConfig/${docId}`).set(data, { merge: true });
      return { updated: true };
    }

    // Generic write: requires { path, data }
    if (type === 'write') {
      const { path, data } = payload || {};
      if (!path || !data) throw new functions.https.HttpsError('invalid-argument', 'path and data required');
      await db.doc(path).set(data, { merge: true });
      return { updated: true };
    }

    throw new functions.https.HttpsError('invalid-argument', 'Unknown action type');
  } catch (err) {
    console.error('adminUpdate error', err);
    throw new functions.https.HttpsError('internal', String(err));
  }
});
