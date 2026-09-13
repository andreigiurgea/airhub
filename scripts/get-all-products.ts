import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);

    console.log(`\n✓ Successfully connected to Firebase`);
    console.log(`✓ Found ${snapshot.size} products in the database\n`);
    console.log('='.repeat(80));

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nProduct ${index + 1}:`);
      console.log(JSON.stringify({
        id: doc.id,
        ...data
      }, null, 2));
      console.log('-'.repeat(80));
    });

    console.log('\n✓ All products retrieved successfully!\n');
  } catch (error) {
    console.error('❌ Error fetching products:', error);
  }

  process.exit(0);
})();
