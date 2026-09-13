import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING FIREBASE STRUCTURE');
    console.log('='.repeat(80) + '\n');

    // Check global purchases
    console.log('1. Checking global purchases collection:');
    const purchasesRef = collection(db, 'purchases');
    const purchasesSnapshot = await getDocs(purchasesRef);
    console.log(`   Found ${purchasesSnapshot.size} documents\n`);

    // Check dropzones
    console.log('2. Checking dropzones collection:');
    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);
    console.log(`   Found ${dropzonesSnapshot.size} dropzones\n`);

    // Check each dropzone for subcollections
    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneData = dropzoneDoc.data();
      console.log(`   Dropzone: ${dropzoneData.name} (${dropzoneDoc.id})`);

      // Check purchases subcollection
      const dzPurchasesRef = collection(db, 'dropzones', dropzoneDoc.id, 'purchases');
      const dzPurchasesSnapshot = await getDocs(dzPurchasesRef);
      console.log(`     - purchases subcollection: ${dzPurchasesSnapshot.size} documents`);

      // Check shop_products subcollection
      const shopProductsRef = collection(db, 'dropzones', dropzoneDoc.id, 'shop_products');
      const shopProductsSnapshot = await getDocs(shopProductsRef);
      console.log(`     - shop_products subcollection: ${shopProductsSnapshot.size} documents`);

      // Check checked_in_users subcollection
      const checkedInRef = collection(db, 'dropzones', dropzoneDoc.id, 'checked_in_users');
      const checkedInSnapshot = await getDocs(checkedInRef);
      console.log(`     - checked_in_users subcollection: ${checkedInSnapshot.size} documents\n`);
    }

    // Check customers
    console.log('3. Checking customers collection:');
    const customersRef = collection(db, 'customers');
    const customersSnapshot = await getDocs(customersRef);
    console.log(`   Found ${customersSnapshot.size} customers\n`);

    // Check credits
    console.log('4. Checking credits collection:');
    const creditsRef = collection(db, 'credits');
    const creditsSnapshot = await getDocs(creditsRef);
    console.log(`   Found ${creditsSnapshot.size} credit records\n`);

    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
