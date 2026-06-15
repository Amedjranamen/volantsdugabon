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
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};

    // Set test image URLs
    const newCategoryImage = 'https://example.com/test-category-image.jpg';
    const newGroupImage = 'https://example.com/test-group-image.jpg';

    // Update first category with id '6' if exists
    const categories = Array.isArray(data.categories) ? data.categories.slice() : [];
    const catIndex = categories.findIndex(c => c && c.id === '6');
    if (catIndex !== -1) {
      categories[catIndex] = { ...categories[catIndex], imageUrl: newCategoryImage };
    } else if (categories.length > 0) {
      categories[0] = { ...categories[0], imageUrl: newCategoryImage };
    }

    // Update group id '2' if exists
    const groups = Array.isArray(data.categoryGroups) ? data.categoryGroups.slice() : [];
    const gIndex = groups.findIndex(g => g && g.id === '2');
    if (gIndex !== -1) {
      groups[gIndex] = { ...groups[gIndex], imageUrl: newGroupImage };
    } else if (groups.length > 0) {
      groups[0] = { ...groups[0], imageUrl: newGroupImage };
    }

    await ref.set({ categories, categoryGroups: groups, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.log('WROTE test image URLs to siteConfig/content');
  } catch (e) {
    console.error('ERROR writing test images:', e && e.message ? e.message : e);
    process.exit(2);
  }
  process.exit(0);
})();
