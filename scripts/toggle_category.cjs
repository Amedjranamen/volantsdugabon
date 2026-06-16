const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const id = process.argv[2];
const desired = process.argv[3]; // optional: 'true' or 'false'
if (!id) {
  console.error('Usage: node toggle_category.cjs <categoryId> [true|false]');
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
    const idx = cats.findIndex(c => String(c.id) === String(id));
    if (idx === -1) {
      console.error('Category id not found:', id);
      process.exit(3);
    }
    const current = !!cats[idx].isActive;
    const newVal = typeof desired !== 'undefined' ? (String(desired) === 'true') : !current;
    cats[idx].isActive = newVal;
    const out = { ...data, categories: cats, updatedAt: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 } };
    await ref.set(out, { merge: true });
    console.log(`Category ${id} isActive: ${current} -> ${newVal}`);
    process.exit(0);
  } catch (e) {
    console.error('ERROR toggling category:', e && e.message ? e.message : e);
    process.exit(4);
  }
})();
