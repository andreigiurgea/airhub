import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING CART & CHECKOUT FLOW');
    console.log('='.repeat(80) + '\n');

    const testAccountId = 'CKwq0I6WZyNGt2iB64EKVJC1Jbu2';

    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('accountId', '==', testAccountId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ Customer not found');
      process.exit(1);
    }

    const customerData = querySnapshot.docs[0].data();
    const customerId = customerData.id;

    console.log('✓ Found customer:', customerId);
    console.log('  Account ID:', testAccountId);
    console.log('  Name:', customerData.name || 'N/A');

    const checkInsRef = collection(db, 'check_ins');
    const checkInsQuery = query(checkInsRef, where('accountId', '==', testAccountId));
    const checkInsSnapshot = await getDocs(checkInsQuery);

    if (checkInsSnapshot.empty) {
      console.log('\n❌ No check-ins found for this user');
      process.exit(1);
    }

    const checkInData = checkInsSnapshot.docs[0].data();
    console.log('\n✓ Found check-in:');
    console.log('  Dropzone ID:', checkInData.dropzoneId);
    console.log('  Dropzone Name:', checkInData.dropzoneName);

    const dropzoneProductsRef = collection(db, 'dropzones', checkInData.dropzoneId, 'shop_products');
    const productsSnapshot = await getDocs(dropzoneProductsRef);

    console.log('\n✓ Dropzone products:', productsSnapshot.size);
    console.log('\nFirst 5 products:');
    productsSnapshot.docs.slice(0, 5).forEach((doc, i) => {
      const product = doc.data();
      console.log(`  ${i + 1}. ${product.name} - ${product.price} AED (Active: ${product.active !== false})`);
    });

    const purchasesRef = collection(db, 'purchases');
    const purchasesQuery = query(purchasesRef, where('customerId', '==', customerId));
    const purchasesSnapshot = await getDocs(purchasesQuery);

    console.log('\n✓ Total purchases:', purchasesSnapshot.size);
    if (purchasesSnapshot.size > 0) {
      console.log('\nLast 3 purchases:');
      const recentPurchases = purchasesSnapshot.docs.slice(-3);
      recentPurchases.forEach((doc) => {
        const purchase = doc.data();
        console.log(`  - ${purchase.dropzoneName || 'Unknown'}`);
        console.log(`    Items: ${purchase.items?.length || 0}`);
        console.log(`    Total: ${purchase.totalAmount} ${purchase.currency}`);
        console.log(`    Payment: ${purchase.paymentMethod}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✓ Cart checkout flow is ready to test!');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
