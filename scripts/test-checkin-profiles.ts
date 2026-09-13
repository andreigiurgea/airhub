import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { checkInToDropzone, checkOutFromDropzone, getCheckedInUsers } from '../lib/dropzoneService';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING CHECK-IN PROFILE STORAGE');
    console.log('='.repeat(80) + '\n');

    // Get a test customer
    const customersRef = collection(db, 'customers');
    const customersSnapshot = await getDocs(customersRef);

    if (customersSnapshot.empty) {
      console.log('❌ No customers found in database');
      process.exit(1);
    }

    const testCustomer = customersSnapshot.docs[0].data();
    console.log(`📋 Test Customer: ${testCustomer.firstName} ${testCustomer.lastName}`);
    console.log(`   Email: ${testCustomer.email}`);
    console.log(`   Account ID: ${testCustomer.accountId}\n`);

    // Get a dropzone
    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    if (dropzonesSnapshot.empty) {
      console.log('❌ No dropzones found in database');
      process.exit(1);
    }

    const testDropzone = dropzonesSnapshot.docs[0];
    const testDropzoneData = testDropzone.data();
    console.log(`🏢 Test Dropzone: ${testDropzoneData.name}`);
    console.log(`   ID: ${testDropzone.id}\n`);

    // Test check-in
    console.log('🔄 Testing check-in...');
    const checkInResult = await checkInToDropzone(testCustomer.accountId, testDropzone.id, true);

    if (checkInResult.success) {
      console.log('✅ Check-in successful\n');

      // Verify profile stored in dropzone
      console.log('🔍 Checking stored profiles in dropzone...');
      const checkedInUsers = await getCheckedInUsers(testDropzone.id);

      console.log(`\nFound ${checkedInUsers.length} checked-in user(s):\n`);

      checkedInUsers.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  Name: ${user.firstName} ${user.lastName}`);
        console.log(`  Nickname: ${user.nickname || 'N/A'}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Phone: ${user.phone || 'N/A'}`);
        console.log(`  License: ${user.licenseType || 'N/A'} ${user.licenseRating || ''}`);
        console.log(`  License Number: ${user.licenseNumber || 'N/A'}`);
        console.log(`  Customer ID: ${user.customerId}`);
        console.log('');
      });

      // Verify data in Firebase
      console.log('🔍 Verifying data in Firebase...');
      const checkedInUsersRef = collection(db, 'dropzones', testDropzone.id, 'checked_in_users');
      const checkedInSnapshot = await getDocs(checkedInUsersRef);

      console.log(`\nFound ${checkedInSnapshot.size} document(s) in dropzones/${testDropzone.id}/checked_in_users`);

      checkedInSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`\nDocument ID: ${doc.id}`);
        console.log(`  Customer ID: ${data.customerId}`);
        console.log(`  Name: ${data.firstName} ${data.lastName}`);
        console.log(`  Checked Out: ${data.checkedOut || false}`);
      });

      // Test check-out
      console.log('\n🔄 Testing check-out...');
      const checkOutResult = await checkOutFromDropzone(testCustomer.accountId);

      if (checkOutResult.success) {
        console.log('✅ Check-out successful\n');

        // Verify profile marked as checked out
        console.log('🔍 Verifying check-out in dropzone...');
        const afterCheckOut = await getDocs(checkedInUsersRef);

        afterCheckOut.forEach((doc) => {
          const data = doc.data();
          if (data.customerId === testCustomer.id) {
            console.log(`\nUser ${data.firstName} ${data.lastName}:`);
            console.log(`  Checked Out: ${data.checkedOut || false}`);
            console.log(`  Checked Out At: ${data.checkedOutAt || 'N/A'}`);
          }
        });

        // Verify active users count
        const activeUsers = await getCheckedInUsers(testDropzone.id);
        console.log(`\n✅ Active checked-in users: ${activeUsers.length}`);
      } else {
        console.log('❌ Check-out failed:', checkOutResult.error);
      }
    } else {
      console.log('❌ Check-in failed:', checkInResult.error);
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
