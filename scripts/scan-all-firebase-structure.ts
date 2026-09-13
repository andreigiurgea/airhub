import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function scanCollection(collectionName: string, parentPath: string = '') {
  try {
    const fullPath = parentPath ? `${parentPath}/${collectionName}` : collectionName;
    const collectionRef = collection(db, fullPath);
    const snapshot = await getDocs(collectionRef);

    if (snapshot.size > 0) {
      console.log(`\n📁 ${fullPath}: ${snapshot.size} documents`);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        console.log(`   📄 ${docSnap.id}`);

        if (data.name) {
          console.log(`      name: ${data.name}`);
        }
        if (data.price !== undefined) {
          console.log(`      price: ${data.price} ${data.currency || ''}`);
        }
        if (data.category) {
          console.log(`      category: ${data.category}`);
        }

        // Try to find subcollections
        const commonSubcollections = ['products', 'items', 'store', 'categories'];
        for (const subColl of commonSubcollections) {
          try {
            const subRef = collection(db, fullPath, docSnap.id, subColl);
            const subSnapshot = await getDocs(subRef);
            if (subSnapshot.size > 0) {
              console.log(`      └─ ${subColl}: ${subSnapshot.size} items`);
              subSnapshot.docs.forEach(subDoc => {
                const subData = subDoc.data();
                console.log(`         - ${subData.name || subDoc.id} (${subData.price || '?'} ${subData.currency || ''})`);
              });
            }
          } catch (e) {
            // Subcollection doesn't exist
          }
        }
      }
    }
  } catch (e) {
    // Collection doesn't exist
  }
}

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE FIREBASE STRUCTURE SCAN');
  console.log('='.repeat(80));

  // Scan root collections
  const rootCollections = [
    'products', 'store', 'shop', 'items', 'tickets', 'camps',
    'equipment', 'extras', 'something', 'categories',
    'dropzones', 'customers', 'loads', 'logbook'
  ];

  for (const collName of rootCollections) {
    await scanCollection(collName);
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
})();
