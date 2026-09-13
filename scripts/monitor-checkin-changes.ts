import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('MONITORING CHECK-IN CHANGES');
  console.log('='.repeat(80) + '\n');

  try {
    // Find your customer
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('accountId', '==', 'jK2YR1tiHccHhvtL0xIzaWldVqK2'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('❌ Customer not found');
      process.exit(1);
    }

    const customerDoc = snapshot.docs[0];
    const customerData = customerDoc.data();
    console.log(`Monitoring check-ins for: ${customerData.firstName} ${customerData.lastName}`);
    console.log(`Customer ID: ${customerData.id}`);
    console.log(`Account ID: ${customerData.accountId}`);

    const currentCheckIn = customerData.currentDropzone;
    if (currentCheckIn) {
      console.log(`\n⚠️  Currently checked in to: ${currentCheckIn.dropzoneName}`);
    } else {
      console.log(`\n✓ Not currently checked in`);
    }

    console.log('\nWatching for changes...\n');
    console.log('Press Ctrl+C to stop monitoring\n');

    let changeCount = 0;

    const unsubscribe = onSnapshot(customerDoc.ref, (doc) => {
      changeCount++;
      const data = doc.data();
      const timestamp = new Date().toLocaleTimeString();

      if (data?.currentDropzone) {
        console.log(`[${timestamp}] 📍 CHECKED IN to: ${data.currentDropzone.dropzoneName}`);
        console.log(`   Dropzone ID: ${data.currentDropzone.dropzoneId}`);
        console.log(`   Change #${changeCount}\n`);
      } else {
        console.log(`[${timestamp}] ✓ CHECKED OUT (no active check-in)`);
        console.log(`   Change #${changeCount}\n`);
      }
    });

    // Keep script running
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
