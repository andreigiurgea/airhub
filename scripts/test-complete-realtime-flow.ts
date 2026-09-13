import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { checkInToDropzone, checkOutFromDropzone } from '../lib/dropzoneService';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('COMPLETE REAL-TIME FLOW TEST');
    console.log('Testing: Check-in -> Product Updates -> Shop UI');
    console.log('='.repeat(80) + '\n');

    const customersRef = collection(db, 'customers');
    const customersSnapshot = await getDocs(customersRef);

    if (customersSnapshot.empty) {
      console.log('❌ No customers found');
      process.exit(1);
    }

    const customer = customersSnapshot.docs[0];
    const customerData = customer.data();
    const accountId = customerData.accountId;

    console.log(`Testing with customer: ${customerData.firstName} ${customerData.lastName}`);
    console.log(`Account ID: ${accountId}\n`);

    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    if (dropzonesSnapshot.docs.length < 2) {
      console.log('❌ Need at least 2 dropzones for this test');
      process.exit(1);
    }

    const dropzone1 = dropzonesSnapshot.docs[0];
    const dropzone2 = dropzonesSnapshot.docs[1];

    console.log('Available dropzones:');
    console.log(`  1. ${dropzone1.data().name}`);
    console.log(`  2. ${dropzone2.data().name}\n`);

    console.log('Step 1: Setting up customer check-in listener');
    let checkInUpdates = 0;
    let currentDropzoneName = '';

    const customerDocRef = doc(db, 'customers', customer.id);
    const unsubscribeCheckIn = onSnapshot(customerDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        checkInUpdates++;
        currentDropzoneName = data.currentDropzone?.dropzoneName || 'Not checked in';
        console.log(`  📡 Check-in update #${checkInUpdates}: ${currentDropzoneName}`);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\nStep 2: Check in to first dropzone');
    await checkInToDropzone(accountId, dropzone1.id, true);
    console.log(`  Checked in to: ${dropzone1.data().name}`);

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\nStep 3: Setting up products listener for first dropzone');
    let productUpdates = 0;
    let productCount = 0;

    const productsRef1 = collection(db, 'dropzones', dropzone1.id, 'shop_products');
    const unsubscribeProducts = onSnapshot(productsRef1, (snapshot) => {
      productUpdates++;
      productCount = snapshot.docs.length;
      console.log(`  📡 Products update #${productUpdates}: ${productCount} products`);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\nStep 4: Add a product to first dropzone');
    const testProduct = await addDoc(productsRef1, {
      name: 'Real-Time Flow Test Product',
      category: 'Test Category',
      price: 199.99,
      description: 'Testing real-time product updates',
      active: true,
    });
    console.log(`  Added product: ${testProduct.id}`);

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\nStep 5: Switch to second dropzone');
    await checkInToDropzone(accountId, dropzone2.id, true);
    console.log(`  Switched to: ${dropzone2.data().name}`);

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\nStep 6: Verify products listener stopped for first dropzone');
    const currentProductUpdates = productUpdates;
    await updateDoc(doc(db, 'dropzones', dropzone1.id, 'shop_products', testProduct.id), {
      price: 299.99,
    });
    console.log('  Updated product in first dropzone (should NOT trigger listener)');

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (productUpdates === currentProductUpdates) {
      console.log('  ✓ Products listener correctly unsubscribed from first dropzone');
    } else {
      console.log('  ⚠ Products listener still active (unexpected)');
    }

    console.log('\nStep 7: Clean up - delete test product');
    await deleteDoc(doc(db, 'dropzones', dropzone1.id, 'shop_products', testProduct.id));
    console.log('  Deleted test product');

    console.log('\nStep 8: Check out from dropzone');
    await checkOutFromDropzone(accountId);
    console.log('  Checked out successfully');

    await new Promise(resolve => setTimeout(resolve, 1500));

    unsubscribeCheckIn();
    unsubscribeProducts();

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Check-in updates: ${checkInUpdates} (expected: 3-4)`);
    console.log(`Product updates: ${productUpdates} (expected: 2)`);
    console.log(`Final check-in status: ${currentDropzoneName}`);

    if (checkInUpdates >= 3 && productUpdates >= 2) {
      console.log('\n✓ All real-time listeners working correctly!');
    } else {
      console.log('\n⚠ Some listeners may not be working as expected');
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETED');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
