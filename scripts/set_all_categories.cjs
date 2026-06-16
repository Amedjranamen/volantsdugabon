const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const arg = process.argv[2]; // 'true' | 'false' | 'toggle'
if (!arg) {
  console.error('Usage: node set_all_categories.cjs <true|false|toggle>');
  process.exit(1);
}

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
    const snap = await ref.get();
    if (!snap.exists) {
      console.error('siteConfig/content does not exist');
      process.exit(2);
    }
    const data = snap.data();
    const cats = Array.isArray(data.categories) ? data.categories : [];
    if (arg === 'toggle') {
      for (const c of cats) c.isActive = !c.isActive;
    } else {
      const val = String(arg) === 'true';
      for (const c of cats) c.isActive = val;
    }
    const out = { ...data, categories: cats, updatedAt: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 } };
    await ref.set(out, { merge: true });
    console.log(`Updated ${cats.length} categories with arg=${arg}`);
    process.exit(0);
  } catch (e) {
    console.error('ERROR setting all categories:', e && e.message ? e.message : e);
    process.exit(3);
  }
})();
