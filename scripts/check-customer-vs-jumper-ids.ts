import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function checkIds() {
  console.log('Checking customer IDs vs jumper IDs...\n');

  try {
    // Get all customers
    const customersSnapshot = await getDocs(collection(db, 'customers'));

    console.log('Customer Records:');
    console.log('='.repeat(80));

    customersSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\nDocument ID: ${doc.id}`);
      console.log(`  Customer ID: ${data.customerId}`);
      console.log(`  Account ID: ${data.accountId}`);
      console.log(`  Name: ${data.firstName} ${data.lastName}`);
      console.log(`  Nickname: ${data.nickname || 'N/A'}`);
    });

    console.log('\n\n' + '='.repeat(80));
    console.log('Jumpers on Loads:');
    console.log('='.repeat(80));

    // Check loads
    const dropzonesSnapshot = await getDocs(collection(db, 'dropzones'));

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const loadsRef = collection(db, 'dropzones', dropzoneDoc.id, 'loads');
      const loadsSnapshot = await getDocs(loadsRef);

      loadsSnapshot.forEach((loadDoc) => {
        const loadData = loadDoc.data();
        if (loadData.jumpers && Array.isArray(loadData.jumpers) && loadData.jumpers.length > 0) {
          console.log(`\nLoad ${loadData.loadNumber} at ${dropzoneDoc.data().name}:`);
          loadData.jumpers.forEach((jumper: any) => {
            console.log(`  Jumper ID: ${jumper.id}`);
            console.log(`  Name: ${jumper.name}`);
          });
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

checkIds();
