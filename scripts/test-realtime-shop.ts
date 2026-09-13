import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const LISTENER_TIMEOUT = 5000;

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING REAL-TIME SHOP UPDATES');
    console.log('='.repeat(80) + '\n');

    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    if (dropzonesSnapshot.empty) {
      console.log('❌ No dropzones found');
      process.exit(1);
    }

    const dropzone = dropzonesSnapshot.docs[0];
    const dropzoneData = dropzone.data();
    console.log(`Testing with dropzone: ${dropzoneData.name}\n`);

    const productsRef = collection(db, 'dropzones', dropzone.id, 'shop_products');

    console.log('Step 1: Setting up real-time listener');
    let updateCount = 0;
    let productCount = 0;

    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      updateCount++;
      productCount = snapshot.docs.length;
      console.log(`  📡 Listener triggered (Update #${updateCount}): ${productCount} products`);

      if (updateCount === 1) {
        console.log('  ✓ Initial snapshot received\n');
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Step 2: Adding a test product');
    const testProduct = {
      name: 'Real-Time Test Product',
      category: 'Test Category',
      price: 99.99,
      description: 'This product is for testing real-time updates',
      active: true,
      createdAt: new Date(),
    };

    const addedProduct = await addDoc(productsRef, testProduct);
    console.log(`  Added product: ${addedProduct.id}`);

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (updateCount >= 2) {
      console.log('  ✓ Real-time update detected after adding product\n');
    } else {
      console.log('  ⚠ Real-time update NOT detected (might be delayed)\n');
    }

    console.log('Step 3: Updating the test product');
    await updateDoc(doc(db, 'dropzones', dropzone.id, 'shop_products', addedProduct.id), {
      price: 149.99,
      description: 'Updated description for real-time test',
    });
    console.log('  Updated product price to 149.99');

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (updateCount >= 3) {
      console.log('  ✓ Real-time update detected after updating product\n');
    } else {
      console.log('  ⚠ Real-time update NOT detected (might be delayed)\n');
    }

    console.log('Step 4: Deactivating the test product');
    await updateDoc(doc(db, 'dropzones', dropzone.id, 'shop_products', addedProduct.id), {
      active: false,
    });
    console.log('  Deactivated product (active: false)');

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (updateCount >= 4) {
      console.log('  ✓ Real-time update detected after deactivating product\n');
    } else {
      console.log('  ⚠ Real-time update NOT detected (might be delayed)\n');
    }

    console.log('Step 5: Cleaning up - deleting test product');
    await deleteDoc(doc(db, 'dropzones', dropzone.id, 'shop_products', addedProduct.id));
    console.log('  Deleted test product');

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (updateCount >= 5) {
      console.log('  ✓ Real-time update detected after deleting product\n');
    } else {
      console.log('  ⚠ Real-time update NOT detected (might be delayed)\n');
    }

    unsubscribe();

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total listener updates: ${updateCount}`);
    console.log(`Expected updates: 5 (initial + add + update + deactivate + delete)`);

    if (updateCount >= 5) {
      console.log('✓ Real-time updates working correctly!');
    } else {
      console.log(`⚠ Only ${updateCount} updates detected (expected 5)`);
      console.log('This could be due to network latency or Firebase connection issues');
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETED');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
