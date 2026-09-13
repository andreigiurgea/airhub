import { db } from '../lib/firebase';
import { collection, getDocs, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('LIVE SHOP UPDATES DEMONSTRATION');
  console.log('='.repeat(80) + '\n');
  console.log('This simulates what customers see on their shop screen');
  console.log('while an admin makes changes from the manage screen.\n');

  try {
    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    if (dropzonesSnapshot.empty) {
      console.log('❌ No dropzones found');
      process.exit(1);
    }

    const dropzone = dropzonesSnapshot.docs[0];
    const dropzoneData = dropzone.data();

    console.log(`🏢 Customer checks in to: ${dropzoneData.name}`);
    console.log(`📱 Customer opens shop screen...\n`);

    const productsRef = collection(db, 'dropzones', dropzone.id, 'shop_products');

    console.log('═'.repeat(80));
    console.log('SHOP SCREEN (Customer View)');
    console.log('═'.repeat(80) + '\n');

    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const products = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(p => p.active !== false);

      console.clear();
      console.log('\n' + '═'.repeat(80));
      console.log(`${dropzoneData.name} - SHOP`.padStart(50));
      console.log('═'.repeat(80) + '\n');

      if (products.length === 0) {
        console.log('  No products available\n');
      } else {
        const categories = [...new Set(products.map(p => p.category))];

        categories.forEach(category => {
          console.log(`\n  📦 ${category.toUpperCase()}`);
          console.log('  ' + '─'.repeat(76));

          const categoryProducts = products.filter(p => p.category === category);
          categoryProducts.forEach(product => {
            console.log(`\n  ${product.name}`);
            if (product.description) {
              console.log(`  ${product.description}`);
            }
            console.log(`  💰 AED ${product.price}`);
          });
        });
      }

      console.log('\n' + '═'.repeat(80));
      console.log(`Total Products: ${products.length}`.padStart(50));
      console.log('═'.repeat(80) + '\n');
      console.log('  [Products update automatically - no refresh needed]\n');
    });

    console.log('⏳ Watching for changes...\n');
    console.log('💡 TIP: Open the manage screen in another terminal and make changes!');
    console.log('💡 Or run this in a separate terminal:');
    console.log(`   npx tsx -e "require('./lib/firebase'); /* make changes */"\n`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📝 Simulating admin adding a product...\n');

    await addDoc(productsRef, {
      name: 'LIVE DEMO: Special Offer',
      category: 'Promotions',
      price: 99.99,
      description: 'Limited time offer - Book now!',
      active: true,
      createdAt: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const testProduct = await addDoc(productsRef, {
      name: 'LIVE DEMO: New Equipment',
      category: 'Gear',
      price: 150.00,
      description: 'Latest model just arrived',
      active: true,
      createdAt: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📝 Admin updates the price...\n');

    await updateDoc(doc(db, 'dropzones', dropzone.id, 'shop_products', testProduct.id), {
      price: 129.99,
      description: 'Latest model just arrived - SALE!',
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n✅ Demo complete!');
    console.log('As you can see, the shop screen updated automatically with each change.');
    console.log('\nPress Ctrl+C to exit...');

    await new Promise(resolve => setTimeout(resolve, 60000));

    unsubscribe();

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
