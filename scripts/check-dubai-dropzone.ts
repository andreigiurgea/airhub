import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING DUBAI DROPZONE FOR PRODUCTS');
    console.log('='.repeat(80) + '\n');

    const dropzoneId = 'dz_1759905150566_8z7i4ospn';

    // Get dropzone data
    const dropzoneRef = doc(db, 'dropzones', dropzoneId);
    const dropzoneSnap = await getDoc(dropzoneRef);

    if (dropzoneSnap.exists()) {
      console.log('✓ Found dubai dropzone\n');
      const data = dropzoneSnap.data();
      console.log('Dropzone fields:', Object.keys(data).join(', '));

      // Check if products are stored as a field
      if (data.products) {
        console.log('\n📦 Products in dropzone document:');
        console.log(JSON.stringify(data.products, null, 2));
      }

      if (data.store) {
        console.log('\n🏪 Store in dropzone document:');
        console.log(JSON.stringify(data.store, null, 2));
      }
    }

    // Check subcollections
    const subcollections = ['products', 'store', 'items', 'equipment', 'extras', 'camps', 'tickets', 'something'];

    for (const subName of subcollections) {
      try {
        const subRef = collection(db, 'dropzones', dropzoneId, subName);
        const subSnap = await getDocs(subRef);

        if (subSnap.size > 0) {
          console.log(`\n✓ Found ${subSnap.size} items in "${subName}" subcollection:`);
          subSnap.forEach(docSnap => {
            const data = docSnap.data();
            console.log(`\n   ${data.name || docSnap.id}`);
            console.log(`   ID: ${docSnap.id}`);
            console.log(`   Price: ${data.price} ${data.currency || 'AED'}`);
            console.log(`   Category: ${data.category || '[None]'}`);
            console.log(`   Description: ${data.description || '[None]'}`);
            console.log(`   All fields:`, Object.keys(data).join(', '));
          });
        }
      } catch (e) {
        // Subcollection doesn't exist
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
