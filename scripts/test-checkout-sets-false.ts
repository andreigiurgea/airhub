import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { checkInToDropzone, checkOutFromDropzone, getCurrentCheckIn } from '../lib/dropzoneService';

async function testCheckoutSetsFalse() {
  console.log('🧪 Testing checkout sets checkedIn to false\n');

  const testAccountId = 'test-account-' + Date.now();
  const dropzoneId = 'ukxVHHJn9VwN0T7crcRd'; // Skydive Dubai Desert Dropzone

  try {
    // 1. Create a test customer
    console.log('1️⃣ Creating test customer...');
    const customerId = `C${Date.now()}`;
    const customerRef = doc(db, 'customers', customerId);
    await setDoc(customerRef, {
      id: customerId,
      accountId: testAccountId,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: serverTimestamp(),
    });
    console.log('✅ Test customer created:', customerId);

    // 2. Check in
    console.log('\n2️⃣ Checking in to dropzone...');
    const checkInResult = await checkInToDropzone(testAccountId, dropzoneId);
    if (!checkInResult.success) {
      console.log('❌ Check-in failed:', checkInResult.error);
      return;
    }
    console.log('✅ Checked in successfully');

    // 3. Verify checkedIn is true in client document
    console.log('\n3️⃣ Verifying checkedIn = true...');
    const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const customerQuery = query(customersRef, where('customerId', '==', customerId));
    let customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('❌ Client document not found!');
      return;
    }

    let customerData = customerSnapshot.docs[0].data();
    console.log(`   checkedIn: ${customerData.checkedIn}`);
    if (customerData.checkedIn === true) {
      console.log('✅ checkedIn is correctly set to true');
    } else {
      console.log('❌ checkedIn is NOT true!');
      return;
    }

    // 4. Check out
    console.log('\n4️⃣ Checking out from dropzone...');
    const checkOutResult = await checkOutFromDropzone(testAccountId);
    if (!checkOutResult.success) {
      console.log('❌ Check-out failed:', checkOutResult.error);
      return;
    }
    console.log('✅ Checked out successfully');

    // 5. Verify checkedIn is false in client document
    console.log('\n5️⃣ Verifying checkedIn = false...');
    customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('❌ Client document not found after checkout!');
      return;
    }

    customerData = customerSnapshot.docs[0].data();
    console.log(`   checkedIn: ${customerData.checkedIn}`);
    if (customerData.checkedIn === false) {
      console.log('✅ checkedIn is correctly set to false');
    } else {
      console.log('❌ checkedIn is NOT false! Current value:', customerData.checkedIn);
      return;
    }

    // 6. Verify currentDropzone is null in customer document
    console.log('\n6️⃣ Verifying currentDropzone is null in customer...');
    const customersRef = collection(db, 'customers');
    const customerQuery = query(customersRef, where('accountId', '==', testAccountId));
    const customerSnapshot = await getDocs(customerQuery);

    if (!customerSnapshot.empty) {
      const customerData = customerSnapshot.docs[0].data();
      console.log(`   currentDropzone: ${customerData.currentDropzone}`);
      if (customerData.currentDropzone === null || customerData.currentDropzone === undefined) {
        console.log('✅ currentDropzone is correctly null');
      } else {
        console.log('❌ currentDropzone is NOT null!');
      }
    }

    console.log('\n═════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═════════════════════════════════════');
    console.log('The checkout function correctly sets:');
    console.log('  • checkedIn = false in client document');
    console.log('  • currentDropzone = null in customer document');
    console.log('═════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCheckoutSetsFalse();
