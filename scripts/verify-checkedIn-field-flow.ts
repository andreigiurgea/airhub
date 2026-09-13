import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import {
  checkInToDropzone,
  checkOutFromDropzone,
  getAllDropzones,
} from '../lib/dropzoneService';

async function verifyCheckedInFieldFlow() {
  console.log('🧪 Testing checkedIn field during check-in/checkout flow...\n');

  try {
    // Step 1: Find a test customer
    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);

    if (snapshot.empty) {
      console.log('❌ No customers found in database');
      return;
    }

    const testCustomerDoc = snapshot.docs[0];
    const testCustomer = testCustomerDoc.data();
    const accountId = testCustomer.accountId;

    console.log('📋 Test Customer:');
    console.log(`   Name: ${testCustomer.firstName} ${testCustomer.lastName}`);
    console.log(`   Customer ID: ${testCustomer.id}`);
    console.log(`   Account ID: ${accountId}\n`);

    // Step 2: Get a dropzone
    const dropzones = await getAllDropzones();
    if (dropzones.length === 0) {
      console.log('❌ No dropzones found');
      return;
    }

    const testDropzone = dropzones[0];
    console.log('📍 Test Dropzone:');
    console.log(`   Name: ${testDropzone.name}`);
    console.log(`   ID: ${testDropzone.id}\n`);

    // Step 3: Check out if already checked in
    if (testCustomer.currentDropzone) {
      console.log('🔄 Customer is already checked in, checking out first...\n');
      const checkoutResult = await checkOutFromDropzone(accountId);
      if (checkoutResult.success) {
        console.log('✅ Successfully checked out\n');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Firestore
      }
    }

    // Step 4: Check in
    console.log('🔵 Step 1: Checking in to dropzone...');
    const checkinResult = await checkInToDropzone(accountId, testDropzone.id);

    if (!checkinResult.success) {
      console.log('❌ Check-in failed:', checkinResult.error);
      return;
    }

    console.log('✅ Check-in successful!\n');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for Firestore

    // Step 5: Verify client record has checkedIn = true
    console.log('🔍 Verifying client record after check-in...');
    const customersRef = collection(db, 'dropzones', testDropzone.id, 'customers');
    const customerQuery = query(customersRef, where('customerId', '==', testCustomer.id));
    const customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('❌ Client record not found after check-in');
      return;
    }

    const customerDoc = customerSnapshot.docs[0];
    const customerData = customerDoc.data();

    console.log('📊 Client Record:');
    console.log(`   checkedIn: ${customerData.checkedIn}`);
    console.log(`   firstName: ${customerData.firstName}`);
    console.log(`   lastName: ${customerData.lastName}`);

    if (customerData.checkedIn === true) {
      console.log('✅ checkedIn field is TRUE (correct!)\n');
    } else {
      console.log('❌ checkedIn field is not TRUE (expected: true, got:', customerData.checkedIn, ')\n');
    }

    // Step 6: Check out
    console.log('🔴 Step 2: Checking out from dropzone...');
    const checkoutResult = await checkOutFromDropzone(accountId);

    if (!checkoutResult.success) {
      console.log('❌ Check-out failed:', checkoutResult.error);
      return;
    }

    console.log('✅ Check-out successful!\n');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for Firestore

    // Step 7: Verify client record has checkedIn = false
    console.log('🔍 Verifying client record after check-out...');
    const customerSnapshotAfter = await getDocs(customerQuery);

    if (customerSnapshotAfter.empty) {
      console.log('❌ Client record not found after check-out');
      return;
    }

    const customerDocAfter = customerSnapshotAfter.docs[0];
    const customerDataAfter = customerDocAfter.data();

    console.log('📊 Client Record:');
    console.log(`   checkedIn: ${customerDataAfter.checkedIn}`);
    console.log(`   firstName: ${customerDataAfter.firstName}`);
    console.log(`   lastName: ${customerDataAfter.lastName}`);

    if (customerDataAfter.checkedIn === false) {
      console.log('✅ checkedIn field is FALSE (correct!)\n');
    } else {
      console.log('❌ checkedIn field is not FALSE (expected: false, got:', customerDataAfter.checkedIn, ')\n');
    }

    // Final summary
    console.log('════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('════════════════════════════════════════');

    const checkinPassed = customerData.checkedIn === true;
    const checkoutPassed = customerDataAfter.checkedIn === false;

    console.log(`Check-in sets checkedIn=true:  ${checkinPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Check-out sets checkedIn=false: ${checkoutPassed ? '✅ PASS' : '❌ FAIL'}`);

    if (checkinPassed && checkoutPassed) {
      console.log('\n🎉 All tests PASSED!');
    } else {
      console.log('\n⚠️  Some tests FAILED');
    }
    console.log('════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyCheckedInFieldFlow();
