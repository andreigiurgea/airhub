import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function testManifestCheck() {
  console.log('Testing manifest checking logic...\n');

  const currentCustomerId = 'C9688357'; // Andreipatru
  console.log(`Testing for customer: ${currentCustomerId}`);

  try {
    // Get TNT dropzone
    const dropzonesSnapshot = await getDocs(
      query(collection(db, 'dropzones'), where('name', '==', 'TNT Brothers Clinceni'))
    );

    if (dropzonesSnapshot.empty) {
      console.log('TNT dropzone not found');
      return;
    }

    const dropzoneDoc = dropzonesSnapshot.docs[0];
    console.log(`\nDropzone: ${dropzoneDoc.data().name}`);

    // Get all loads
    const loadsRef = collection(db, 'dropzones', dropzoneDoc.id, 'loads');
    const loadsSnapshot = await getDocs(loadsRef);

    console.log(`\nFound ${loadsSnapshot.size} loads\n`);

    loadsSnapshot.forEach((loadDoc) => {
      const loadData = loadDoc.data();
      console.log(`\nLoad ${loadData.loadNumber}:`);

      if (loadData.jumpers && Array.isArray(loadData.jumpers)) {
        console.log(`  Total jumpers: ${loadData.jumpers.length}`);

        loadData.jumpers.forEach((jumper: any) => {
          console.log(`\n  Jumper:`);
          console.log(`    Name: ${jumper.name}`);
          console.log(`    ID: ${jumper.id}`);
          console.log(`    Customer ID: ${jumper.customerId || 'N/A'}`);

          // Test the matching logic
          const matchesById = jumper.id === currentCustomerId;
          const matchesByCustomerId = jumper.customerId === currentCustomerId;
          const matches = matchesById || matchesByCustomerId;

          console.log(`    Matches by ID: ${matchesById}`);
          console.log(`    Matches by Customer ID: ${matchesByCustomerId}`);
          console.log(`    → Overall match: ${matches}`);
        });
      } else {
        console.log('  No jumpers');
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

testManifestCheck();
