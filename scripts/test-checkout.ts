import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { checkInToDropzone, checkOutFromDropzone, getCurrentCheckIn } from '../lib/dropzoneService';

const TEST_ACCOUNT_ID = 'test_user_123';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING CHECK-IN/CHECK-OUT FUNCTIONALITY');
    console.log('='.repeat(80) + '\n');

    const customersRef = collection(db, 'customers');
    const q = query(customersRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('❌ No customers found in database');
      process.exit(1);
    }

    const customer = snapshot.docs[0];
    const customerData = customer.data();
    const accountId = customerData.accountId;

    console.log(`Testing with customer: ${customerData.firstName} ${customerData.lastName}`);
    console.log(`Account ID: ${accountId}\n`);

    console.log('Step 1: Check current status');
    let status = await getCurrentCheckIn(accountId);
    console.log('Current check-in:', status ? status.dropzoneName : 'Not checked in');
    console.log('');

    if (status) {
      console.log('Step 2: Check out from current dropzone');
      const checkoutResult = await checkOutFromDropzone(accountId);
      console.log('Check-out result:', checkoutResult.success ? '✓ Success' : `✗ Failed: ${checkoutResult.error}`);
      console.log('');

      status = await getCurrentCheckIn(accountId);
      console.log('Status after checkout:', status ? status.dropzoneName : 'Not checked in');
      console.log('');
    }

    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    if (dropzonesSnapshot.empty) {
      console.log('❌ No dropzones found');
      process.exit(1);
    }

    const dropzone1 = dropzonesSnapshot.docs[0];
    const dropzone2 = dropzonesSnapshot.docs[1] || dropzone1;

    console.log('Step 3: Check in to first dropzone');
    console.log(`Checking in to: ${dropzone1.data().name}`);
    let checkinResult = await checkInToDropzone(accountId, dropzone1.id);
    console.log('Check-in result:', checkinResult.success ? '✓ Success' : `✗ Failed: ${checkinResult.error}`);
    console.log('');

    status = await getCurrentCheckIn(accountId);
    console.log('Current status:', status ? status.dropzoneName : 'Not checked in');
    console.log('');

    if (dropzonesSnapshot.docs.length > 1) {
      console.log('Step 4: Try to check in to second dropzone (should request confirmation)');
      console.log(`Trying to check in to: ${dropzone2.data().name}`);
      checkinResult = await checkInToDropzone(accountId, dropzone2.id);
      if (checkinResult.needsConfirmation) {
        console.log('✓ Confirmation required (as expected)');
        console.log(`  Current dropzone: ${checkinResult.currentDropzone}`);
        console.log('');

        console.log('Step 5: Switch to second dropzone with allowSwitch=true');
        checkinResult = await checkInToDropzone(accountId, dropzone2.id, true);
        console.log('Switch result:', checkinResult.success ? '✓ Success' : `✗ Failed: ${checkinResult.error}`);
        console.log('');

        status = await getCurrentCheckIn(accountId);
        console.log('Current status:', status ? status.dropzoneName : 'Not checked in');
        console.log('');
      } else {
        console.log('Result:', checkinResult.success ? '✓ Success' : `✗ Failed: ${checkinResult.error}`);
      }
    }

    console.log('Step 6: Final check-out');
    const finalCheckout = await checkOutFromDropzone(accountId);
    console.log('Check-out result:', finalCheckout.success ? '✓ Success' : `✗ Failed: ${finalCheckout.error}`);
    console.log('');

    status = await getCurrentCheckIn(accountId);
    console.log('Final status:', status ? status.dropzoneName : 'Not checked in');

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETED');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
