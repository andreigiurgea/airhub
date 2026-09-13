import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('SCANNING ALL DROPZONES FOR CLIENTS');
    console.log('='.repeat(80) + '\n');

    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    console.log(`Found ${dropzonesSnapshot.size} dropzones\n`);

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneData = dropzoneDoc.data();
      console.log(`Dropzone: ${dropzoneData.name} (${dropzoneDoc.id})`);

      // Check clients subcollection
      const customersRef = collection(db, 'dropzones', dropzoneDoc.id, 'customers');
      const customersSnapshot = await getDocs(customersRef);

      console.log(`  Clients: ${customersSnapshot.size}`);

      if (customersSnapshot.size > 0) {
        for (const customerDoc of customersSnapshot.docs) {
          const customerData = customerDoc.data();
          console.log(`\n    Client ID: ${customerDoc.id}`);
          console.log(`    Customer ID: ${customerData.customerId || 'N/A'}`);
          console.log(`    Data:`, JSON.stringify(customerData, null, 2));

          // Check credits subcollection
          const creditsRef = collection(db, 'dropzones', dropzoneDoc.id, 'customers', customerDoc.id, 'credits');
          const creditsSnapshot = await getDocs(creditsRef);
          console.log(`    Credits docs: ${creditsSnapshot.size}`);

          creditsSnapshot.forEach((creditDoc) => {
            console.log(`      - ${creditDoc.id}:`, creditDoc.data());
          });
        }
      }

      console.log('');
    }

    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
