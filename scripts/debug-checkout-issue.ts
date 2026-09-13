import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { checkOutFromDropzone } from '../lib/dropzoneService';

const accountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('DEBUGGING CHECK-OUT ISSUE');
  console.log('='.repeat(80) + '\n');

  // Find customer document
  const customersRef = collection(db, 'customers');
  const q = query(customersRef, where('accountId', '==', accountId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('❌ Customer not found');
    process.exit(1);
  }

  const customerDoc = snapshot.docs[0];
  const customerData = customerDoc.data();

  console.log(`Monitoring: ${customerData.firstName} ${customerData.lastName}`);
  console.log(`Customer ID: ${customerData.id}`);
  console.log(`Account ID: ${customerData.accountId}\n`);

  // Set up listener BEFORE checkout
  console.log('Setting up real-time listener...');
  const customerDocRef = doc(db, 'customers', customerDoc.id);

  let changeCount = 0;
  const unsubscribe = onSnapshot(customerDocRef, (doc) => {
    changeCount++;
    const data = doc.data();
    const timestamp = new Date().toLocaleTimeString();

    console.log(`\n[${timestamp}] Change #${changeCount}`);

    if (data?.currentDropzone) {
      console.log(`  📍 CHECKED IN: ${data.currentDropzone.dropzoneName}`);
      console.log(`     Dropzone ID: ${data.currentDropzone.dropzoneId}`);
      if (data.currentDropzone.checkedInAt) {
        console.log(`     Checked in at: ${data.currentDropzone.checkedInAt.toDate()}`);
      }
    } else {
      console.log(`  ✓ CHECKED OUT (currentDropzone is null)`);
    }
  });

  // Wait a bit for listener to settle
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n' + '-'.repeat(80));
  console.log('PERFORMING CHECK-OUT NOW...');
  console.log('-'.repeat(80));

  const result = await checkOutFromDropzone(accountId);
  console.log(`\nCheck-out function returned: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }

  console.log('\nWatching for changes for 10 seconds...');
  console.log('(Check if anything is re-checking you in)\n');

  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('\n' + '='.repeat(80));
  console.log(`Total changes detected: ${changeCount}`);
  console.log('='.repeat(80) + '\n');

  unsubscribe();
  process.exit(0);
})();
