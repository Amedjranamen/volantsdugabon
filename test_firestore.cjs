const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

const config = {
  apiKey: 'AIzaSyCKgHphnbE5_nF_QB3NU1Y9l7jVYMH73Fg',
  projectId: 'les-volants-d-or'
};

const app = initializeApp(config);
const db = getFirestore(app);

async function test() {
  try {
    process.stdout.write('Testing write...\n');
    await setDoc(doc(db, 'siteConfig', 'sponsors'), {
      list: [{ id: 'test-1', name: 'Sponsor Test', logoUrl: 'https://placehold.co/120x40', active: true }]
    });
    process.stdout.write('Write OK\n');

    process.stdout.write('Testing read...\n');
    const snap = await getDoc(doc(db, 'siteConfig', 'sponsors'));
    if (snap.exists()) {
      process.stdout.write('Read OK: ' + JSON.stringify(snap.data().list) + '\n');
    } else {
      process.stdout.write('Document does not exist\n');
    }
  } catch(e) {
    process.stdout.write('ERROR: ' + e.message + '\n');
  }
  process.exit(0);
}

test();
