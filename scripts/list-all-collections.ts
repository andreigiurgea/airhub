import { db } from '../lib/firebase';
import { collection, getDocs, listCollections } from 'firebase/firestore';

(async () => {
  // We can't directly list all collections, but we can try common ones
  const commonCollections = [
    'customers', 'loads', 'jumps', 'logbook', 'dropzones',
    'products', 'store', 'tickets', 'storeItems', 'camps', 'events'
  ];

  console.log('Checking collections:');
  for (const col of commonCollections) {
    try {
      const snapshot = await getDocs(collection(db, col));
      if (snapshot.size > 0) {
        console.log(`\n${col}: ${snapshot.size} documents`);
        const doc = snapshot.docs[0];
        console.log('Sample:', JSON.stringify(doc.data(), null, 2).substring(0, 200));
      }
    } catch (e) {
      // Skip
    }
  }

  process.exit(0);
})();
