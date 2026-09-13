import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING CUSTOMER CHECK-IN STATUS');
    console.log('='.repeat(80) + '\n');

    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);

    console.log(`Found ${snapshot.size} customers\n`);

    let checkedInCount = 0;

    for (const customerDoc of snapshot.docs) {
      const data = customerDoc.data();
      const email = data.email || 'No email';
      const firstName = data.firstName || '';
      const lastName = data.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'No name';

      if (data.currentDropzone) {
        checkedInCount++;
        console.log(`✓ CHECKED IN - ${fullName} (${email})`);
        console.log(`  Customer ID: ${data.id || customerDoc.id}`);
        console.log(`  Account ID: ${data.accountId || 'No account ID'}`);
        console.log(`  Checked into: ${data.currentDropzone.dropzoneName || 'Unknown dropzone'}`);
        console.log(`  Dropzone ID: ${data.currentDropzone.dropzoneId}`);
        console.log(`  Checked in at: ${data.currentDropzone.checkedInAt}`);
        console.log('');
      }
    }

    console.log('='.repeat(80));
    console.log(`Summary: ${checkedInCount} out of ${snapshot.size} customers are checked in`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
