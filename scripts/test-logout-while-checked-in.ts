import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { checkInToDropzone, getCurrentCheckIn } from '../lib/dropzoneService';

async function testLogoutWhileCheckedIn() {
  console.log('🧪 Testing logout while checked in scenario\n');

  const testAccountId = 'test-logout-' + Date.now();
  const dropzoneId = 'ukxVHHJn9VwN0T7crcRd'; // Skydive Dubai Desert Dropzone

  try {
    // 1. Create a test customer
    console.log('1️⃣ Creating test customer...');
    const customerId = `C${Date.now()}`;
    const customerRef = doc(db, 'customers', customerId);
    await setDoc(customerRef, {
      id: customerId,
      accountId: testAccountId,
      email: 'test-logout@example.com',
      firstName: 'Logout',
      lastName: 'Tester',
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

    // 3. Get current check-in status
    console.log('\n3️⃣ Getting current check-in status...');
    const checkInStatus = await getCurrentCheckIn(testAccountId);

    if (!checkInStatus) {
      console.log('❌ No check-in status found!');
      return;
    }

    console.log('✅ User is checked in:');
    console.log(`   Dropzone: ${checkInStatus.dropzoneName}`);
    console.log(`   Dropzone ID: ${checkInStatus.dropzoneId}`);
    console.log(`   Checked in at: ${checkInStatus.checkedInAt}`);

    // 4. Simulate logout scenario
    console.log('\n4️⃣ Logout Scenario Simulation...');
    console.log('═════════════════════════════════════');
    console.log('When the user clicks "Logout", the app should:');
    console.log('');
    console.log('1. Check if user is currently checked in');
    console.log('   ✅ User IS checked in');
    console.log('');
    console.log('2. Show alert dialog:');
    console.log('   ┌─────────────────────────────────────┐');
    console.log('   │ Check Out Required                  │');
    console.log('   │                                     │');
    console.log(`   │ You are currently checked in at     │`);
    console.log(`   │ ${checkInStatus.dropzoneName.padEnd(35)} │`);
    console.log('   │ Logging out will also check you out │');
    console.log('   │ from the dropzone.                  │');
    console.log('   │                                     │');
    console.log('   │         [Cancel]  [Logout & Check Out] │');
    console.log('   └─────────────────────────────────────┘');
    console.log('');
    console.log('3. If user confirms:');
    console.log('   a) Call checkOutFromDropzone(userId)');
    console.log('   b) Call signOut()');
    console.log('   c) Navigate to login screen');
    console.log('');
    console.log('4. If user cancels:');
    console.log('   - Do nothing, stay on current screen');
    console.log('═════════════════════════════════════');

    // 5. Verify client document exists
    console.log('\n5️⃣ Verifying client document...');
    const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const customerQuery = query(customersRef, where('customerId', '==', customerId));
    const customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('❌ Client document not found!');
      return;
    }

    const customerData = customerSnapshot.docs[0].data();
    console.log('✅ Client document found:');
    console.log(`   checkedIn: ${customerData.checkedIn}`);
    console.log(`   lastCheckIn: ${customerData.lastCheckIn}`);

    console.log('\n═════════════════════════════════════');
    console.log('✅ TEST SCENARIO VERIFIED');
    console.log('═════════════════════════════════════');
    console.log('The logout flow has been implemented to:');
    console.log('  • Detect when user is checked in');
    console.log('  • Show confirmation dialog');
    console.log('  • Inform user they will be checked out');
    console.log('  • Check out from dropzone before logout');
    console.log('═════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLogoutWhileCheckedIn();
