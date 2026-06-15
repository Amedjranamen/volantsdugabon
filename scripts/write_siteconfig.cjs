const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const keyPath = process.env.SERVICE_ACCOUNT_KEY || path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('Service account not found at', keyPath);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

(async function() {
  try {
    const ref = db.doc('siteConfig/content');
    await ref.set({ assistantTest: { by: 'assistant', at: FieldValue.serverTimestamp() } }, { merge: true });
    console.log('WROTE assistantTest to siteConfig/content');
  } catch (e) {
    console.error('ERROR writing siteConfig/content:', e && e.message ? e.message : e);
    process.exit(2);
  }
  process.exit(0);
})();
