const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const keyPath = process.env.SERVICE_ACCOUNT_KEY || path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('Service account file not found:', keyPath);
  console.error('Create a serviceAccountKey.json from Firebase Console and place it here, or set SERVICE_ACCOUNT_KEY env var.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node set-admin.js <USER_UID>');
  process.exit(1);
}

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Custom claim 'admin:true' set for UID: ${uid}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error setting custom claim:', err);
    process.exit(1);
  });
