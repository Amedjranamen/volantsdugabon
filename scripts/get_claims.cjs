const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const keyPath = process.env.SERVICE_ACCOUNT_KEY || path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('Service account not found at', keyPath);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: node scripts/get_claims.cjs <email-or-uid>');
  process.exit(1);
}

(async function() {
  try {
    const auth = getAuth();
    let user;
    if (identifier.includes('@')) {
      user = await auth.getUserByEmail(identifier);
    } else {
      user = await auth.getUser(identifier);
    }
    console.log('UID:', user.uid);
    console.log('Custom claims:', user.customClaims || {});
  } catch (e) {
    console.error('Error fetching user:', e && e.message ? e.message : e);
    process.exit(2);
  }
})();
