import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('DEEP CHECK OF TNT BROTHERS DROPZONE');
    console.log('='.repeat(80) + '\n');

    const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

    // Get dropzone document
    const dropzoneRef = doc(db, 'dropzones', dropzoneId);
    const dropzoneSnap = await getDoc(dropzoneRef);

    if (dropzoneSnap.exists()) {
      const data = dropzoneSnap.data();
      console.log('📍 TNT Brothers Clinceni');
      console.log('   All fields:', Object.keys(data).join(', '));
      console.log('\n   Document data:');
      console.log(JSON.stringify(data, null, 2));
    }

    console.log('\n' + '-'.repeat(80));
    console.log('Checking all possible product subcollections:');
    console.log('-'.repeat(80) + '\n');

    const possibleCollections = [
      'products',
      'shop_products',
      'store',
      'items',
      'equipment',
      'tickets',
      'extras',
      'gear',
      'merchandise'
    ];

    for (const collectionName of possibleCollections) {
      try {
        const subRef = collection(db, 'dropzones', dropzoneId, collectionName);
        const subSnap = await getDocs(subRef);

        if (subSnap.size > 0) {
          console.log(`\n✓ ${collectionName}: ${subSnap.size} items`);
          subSnap.forEach(productDoc => {
            const product = productDoc.data();
            console.log(`\n   • ${product.name || '[No name]'}`);
            console.log(`     ID: ${productDoc.id}`);
            console.log(`     Price: ${product.price} ${product.currency || 'AED'}`);
            console.log(`     Category: ${product.category || '[None]'}`);
            console.log(`     Active: ${product.active !== false ? 'Yes' : 'No'}`);
            console.log(`     All fields:`, Object.keys(product).join(', '));
          });
        } else {
          console.log(`✗ ${collectionName}: empty`);
        }
      } catch (e) {
        console.log(`✗ ${collectionName}: error - ${e}`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
