import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkDropzoneCustomers() {
  console.log('Checking dropzone customers...\n');

  try {
    const dropzonesSnapshot = await getDocs(collection(db, 'dropzones'));

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneName = dropzoneDoc.data().name;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Dropzone: ${dropzoneName}`);
      console.log(`ID: ${dropzoneDoc.id}`);
      console.log('='.repeat(80));

      const customersRef = collection(db, 'dropzones', dropzoneDoc.id, 'customers');
      const customersSnapshot = await getDocs(customersRef);

      if (customersSnapshot.empty) {
        console.log('No customers found');
        continue;
      }

      console.log(`\nFound ${customersSnapshot.size} customers:`);

      customersSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`\nCustomer Doc ID: ${doc.id}`);
        console.log(`  Customer ID: ${data.customerId || 'N/A'}`);
        console.log(`  Name: ${data.firstName} ${data.lastName}`);
        console.log(`  Nickname: ${data.nickname || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

checkDropzoneCustomers();
