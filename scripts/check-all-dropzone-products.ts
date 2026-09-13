import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING ALL DROPZONES FOR PRODUCTS');
    console.log('='.repeat(80) + '\n');

    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneData = dropzoneDoc.data();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📍 ${dropzoneData.name || 'Unnamed Dropzone'}`);
      console.log(`   ID: ${dropzoneDoc.id}`);
      console.log(`${'='.repeat(60)}\n`);

      // Check various possible subcollections
      const subcollections = ['products', 'shop_products', 'store', 'items'];

      for (const subName of subcollections) {
        try {
          const subRef = collection(db, 'dropzones', dropzoneDoc.id, subName);
          const subSnap = await getDocs(subRef);

          if (subSnap.size > 0) {
            console.log(`✓ Found ${subSnap.size} items in "${subName}" subcollection:`);
            subSnap.forEach(productDoc => {
              const data = productDoc.data();
              console.log(`\n   • ${data.name || 'Unnamed Product'}`);
              console.log(`     ID: ${productDoc.id}`);
              console.log(`     Price: ${data.price} ${data.currency || 'AED'}`);
              console.log(`     Category: ${data.category || '[None]'}`);
              if (data.description) {
                console.log(`     Description: ${data.description}`);
              }
              console.log(`     Active: ${data.active !== false ? 'Yes' : 'No'}`);
            });
            console.log('');
          }
        } catch (e) {
          // Subcollection doesn't exist, skip
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('CHECKING GLOBAL SHOP PRODUCTS COLLECTION');
    console.log('='.repeat(80) + '\n');

    const globalProductsRef = collection(db, 'shop_products');
    const globalProductsSnap = await getDocs(globalProductsRef);

    if (globalProductsSnap.size > 0) {
      console.log(`✓ Found ${globalProductsSnap.size} products in global "shop_products" collection:\n`);
      globalProductsSnap.forEach(productDoc => {
        const data = productDoc.data();
        console.log(`• ${data.name || 'Unnamed Product'}`);
        console.log(`  ID: ${productDoc.id}`);
        console.log(`  Price: ${data.price} ${data.currency || 'AED'}`);
        console.log(`  Category: ${data.category || '[None]'}`);
        console.log(`  Dropzone ID: ${data.dropzoneId || '[Not specified]'}`);
        console.log(`  Active: ${data.active !== false ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('❌ No products in global "shop_products" collection\n');
    }

    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
