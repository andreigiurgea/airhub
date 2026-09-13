import { db } from '../lib/firebase';
import { collection, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING ACTIVE SHOP LISTENER');
    console.log('Simulating: Shop screen open -> Products change -> UI updates');
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

    console.log('Step 1: Simulating shop screen opening');
    console.log('  Setting up listener (like when screen mounts)...');

    let updateCount = 0;
    let lastProductCount = 0;

    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      updateCount++;
      lastProductCount = snapshot.docs.length;

      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price,
        active: doc.data().active
      }));

      console.log(`\n  📡 Listener Update #${updateCount}:`);
      console.log(`     Total products: ${lastProductCount}`);
      products.forEach((p, i) => {
        console.log(`     ${i + 1}. ${p.name} - ${p.price} AED ${p.active ? '(Active)' : '(Inactive)'}`);
      });
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n' + '-'.repeat(80));
    console.log('Step 2: Simulating admin adding product (from manage screen)');
    console.log('  Admin adds product while shop screen is open...\n');

    const newProduct = await addDoc(productsRef, {
      name: 'Active Listener Test Product',
      category: 'Test',
      price: 250.00,
      description: 'Testing active listener',
      active: true,
      createdAt: new Date(),
    });

    console.log(`  ✓ Product added: ${newProduct.id}`);
    console.log('  Waiting for real-time update...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n' + '-'.repeat(80));
    console.log('Step 3: Simulating admin updating product price');
    console.log('  Admin changes price while shop screen is open...\n');

    await updateDoc(doc(db, 'dropzones', dropzone.id, 'shop_products', newProduct.id), {
      price: 350.00,
    });

    console.log('  ✓ Price updated: 250.00 → 350.00 AED');
    console.log('  Waiting for real-time update...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n' + '-'.repeat(80));
    console.log('Step 4: Simulating admin deactivating product');
    console.log('  Admin marks product inactive while shop screen is open...\n');

    await updateDoc(doc(db, 'dropzones', dropzone.id, 'shop_products', newProduct.id), {
      active: false,
    });

    console.log('  ✓ Product deactivated');
    console.log('  Waiting for real-time update...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n' + '-'.repeat(80));
    console.log('Step 5: Cleaning up');

    await deleteDoc(doc(db, 'dropzones', dropzone.id, 'shop_products', newProduct.id));
    console.log('  ✓ Test product deleted');

    await new Promise(resolve => setTimeout(resolve, 2000));

    unsubscribe();

    console.log('\n' + '='.repeat(80));
    console.log('TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Total listener updates: ${updateCount}`);
    console.log(`Expected: 5 (initial + add + update + deactivate + delete)`);
    console.log(`Final product count: ${lastProductCount}`);

    if (updateCount >= 5) {
      console.log('\n✅ SUCCESS: Listener remained active and received all updates!');
      console.log('The shop screen will update automatically while open.');
    } else {
      console.log(`\n⚠️  WARNING: Only ${updateCount} updates received (expected 5)`);
      console.log('The listener may not be staying active.');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
