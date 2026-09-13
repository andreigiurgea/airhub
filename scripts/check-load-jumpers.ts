import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function checkLoadJumpers() {
  console.log('Checking loads and jumpers structure...\n');

  try {
    const dropzonesSnapshot = await getDocs(collection(db, 'dropzones'));

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneName = dropzoneDoc.data().name;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Dropzone: ${dropzoneName}`);
      console.log(`ID: ${dropzoneDoc.id}`);
      console.log('='.repeat(80));

      const loadsRef = collection(db, 'dropzones', dropzoneDoc.id, 'loads');
      const loadsSnapshot = await getDocs(loadsRef);

      if (loadsSnapshot.empty) {
        console.log('No loads found');
        continue;
      }

      loadsSnapshot.forEach((loadDoc) => {
        const loadData = loadDoc.data();
        console.log(`\nLoad ${loadDoc.id}:`);
        console.log(`  Load Number: ${loadData.loadNumber}`);
        console.log(`  Aircraft: ${loadData.aircraft}`);
        console.log(`  Status: ${loadData.status}`);
        console.log(`  Max Slots: ${loadData.maxSlots}`);

        if (loadData.jumpers && Array.isArray(loadData.jumpers)) {
          console.log(`  Jumpers (${loadData.jumpers.length}):`);
          loadData.jumpers.forEach((jumper: any, index: number) => {
            console.log(`    ${index + 1}. ${JSON.stringify(jumper, null, 6)}`);
          });
        } else {
          console.log('  No jumpers');
        }
      });
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

checkLoadJumpers();
