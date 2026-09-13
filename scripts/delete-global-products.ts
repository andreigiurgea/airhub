import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('DELETING ALL GLOBAL SHOP PRODUCTS');
    console.log('='.repeat(80) + '\n');

    const globalProductsRef = collection(db, 'shop_products');
    const snapshot = await getDocs(globalProductsRef);

    console.log(`Found ${snapshot.size} global products to delete\n`);

    let deletedCount = 0;
    for (const productDoc of snapshot.docs) {
      const productData = productDoc.data();
      console.log(`Deleting: ${productData.name} (ID: ${productDoc.id})`);
      await deleteDoc(doc(db, 'shop_products', productDoc.id));
      deletedCount++;
    }

    console.log('\n' + '-'.repeat(80));
    console.log(`✓ Successfully deleted ${deletedCount} global products`);
    console.log('-'.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
