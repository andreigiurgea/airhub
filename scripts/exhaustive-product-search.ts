import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, listCollections } from 'firebase/firestore';

async function searchInAllDropzones() {
  const dropzonesRef = collection(db, 'dropzones');
  const dropzonesSnap = await getDocs(dropzonesRef);

  for (const dropzoneDoc of dropzonesSnap.docs) {
    const dropzoneData = dropzoneDoc.data();
    console.log(`\n🏢 Dropzone: ${dropzoneData.name} (${dropzoneDoc.id})`);

    // Check all possible subcollection names
    const possibleSubcollections = [
      'products', 'store', 'storeItems', 'items', 'shop',
      'equipment', 'extras', 'camps', 'tickets', 'something',
      'categories', 'inventory', 'offerings', 'services'
    ];

    for (const subName of possibleSubcollections) {
      try {
        const subRef = collection(db, 'dropzones', dropzoneDoc.id, subName);
        const subSnap = await getDocs(subRef);

        if (subSnap.size > 0) {
          console.log(`   ✓ ${subName}: ${subSnap.size} items`);
          subSnap.forEach(itemDoc => {
            const item = itemDoc.data();
            console.log(`      - ${item.name || itemDoc.id} | ${item.price || '?'} ${item.currency || 'AED'} | ${item.category || '[No category]'}`);
          });
        }
      } catch (e) {
        // Subcollection doesn't exist
      }
    }
  }
}

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('EXHAUSTIVE PRODUCT SEARCH');
    console.log('='.repeat(80));

    // Search in all dropzones
    await searchInAllDropzones();

    // Search root-level collections
    console.log('\n\n📁 ROOT COLLECTIONS:\n');
    const rootCollections = [
      'something', 'extras', 'equipment', 'camps',
      'categories', 'storeItems', 'inventory'
    ];

    for (const collName of rootCollections) {
      try {
        const collRef = collection(db, collName);
        const snapshot = await getDocs(collRef);

        if (snapshot.size > 0) {
          console.log(`\n✓ ${collName}: ${snapshot.size} items`);
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            console.log(`   - ${data.name || docSnap.id} | ${data.price || '?'} ${data.currency || 'AED'}`);
          });
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
