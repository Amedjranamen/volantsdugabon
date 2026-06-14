const fs = require('fs');
const path = require('path');
// 1. On importe les fonctions spécifiques nécessaires au lieu de l'objet global 'admin'
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const keyPath = process.env.SERVICE_ACCOUNT_KEY || path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('Service account file not found:', keyPath);
  console.error('Create a serviceAccountKey.json from Firebase Console and place it here, or set SERVICE_ACCOUNT_KEY env var.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// 2. Initialisation moderne avec la fonction 'cert' directe
initializeApp({ credential: cert(serviceAccount) });

async function setAdminByIdentifier(identifier) {
  try {
    let uid = identifier;
    // 3. Utilisation de getAuth() au lieu de admin.auth()
    const auth = getAuth();

    if (identifier.includes('@')) {
      // treat as email
      const user = await auth.getUserByEmail(identifier);
      uid = user.uid;
      console.log('Resolved email to UID:', uid);
    }

    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`Custom claim 'admin:true' set for UID: ${uid}`);
    process.exit(0);
  } catch (err) {
    console.error('Error setting custom claim:', err);
    process.exit(1);
  }
}

const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: node set-admin.cjs amedjrananoe@gmail.com');
  process.exit(1);
}

setAdminByIdentifier(identifier);