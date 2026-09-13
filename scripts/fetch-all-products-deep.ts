import { db } from '../lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('DEEP SCAN: ALL PRODUCTS FROM FIREBASE');
    console.log('='.repeat(80) + '\n');

    // Check products collection
    console.log('📦 Scanning "products" collection...\n');
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);

    console.log(`Found ${productsSnapshot.size} documents in "products" collection\n`);

    productsSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.name || '[No name]'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Category: ${data.category || '[No category]'}`);
      console.log(`   Price: ${data.price} ${data.currency}`);
      console.log(`   Type: ${data.type || '[No type]'}`);
      console.log(`   All fields:`, Object.keys(data).join(', '));
      console.log('');
    });

    // Check for other possible collection names
    const possibleCollections = [
      'store',
      'storeItems',
      'shop',
      'items',
      'tickets',
      'camps',
      'equipment',
      'extras',
      'something'
    ];

    console.log('\n' + '-'.repeat(80));
    console.log('🔍 Checking other possible collections...\n');

    for (const collectionName of possibleCollections) {
      try {
        const ref = collection(db, collectionName);
        const snapshot = await getDocs(ref);

        if (snapshot.size > 0) {
          console.log(`✓ Found ${snapshot.size} documents in "${collectionName}" collection`);
          snapshot.forEach((doc, i) => {
            const data = doc.data();
            console.log(`  ${i + 1}. ${data.name || doc.id} - ${data.price || '?'} ${data.currency || ''}`);
          });
          console.log('');
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }

    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
