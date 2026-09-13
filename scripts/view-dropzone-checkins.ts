import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getCheckedInUsers } from '../lib/dropzoneService';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('DROPZONE CHECK-IN STATUS');
    console.log('='.repeat(80) + '\n');

    // Get all dropzones
    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    if (dropzonesSnapshot.empty) {
      console.log('❌ No dropzones found in database');
      process.exit(1);
    }

    console.log(`Found ${dropzonesSnapshot.size} dropzone(s)\n`);

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneData = dropzoneDoc.data();

      console.log('━'.repeat(80));
      console.log(`🏢 ${dropzoneData.name}`);
      console.log(`   Dropzone ID: ${dropzoneDoc.id}`);
      console.log(`   Location: ${dropzoneData.city || 'N/A'}, ${dropzoneData.country || 'N/A'}`);
      console.log('━'.repeat(80));

      const checkedInUsers = await getCheckedInUsers(dropzoneDoc.id);

      if (checkedInUsers.length === 0) {
        console.log('   No users currently checked in\n');
      } else {
        console.log(`\n   ✅ ${checkedInUsers.length} user(s) checked in:\n`);

        checkedInUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.firstName} ${user.lastName}`);
          console.log(`      Customer ID: ${user.customerId}`);
          console.log(`      Email: ${user.email}`);
          if (user.nickname) console.log(`      Nickname: ${user.nickname}`);
          if (user.phone) console.log(`      Phone: ${user.phone}`);
          if (user.licenseType) {
            console.log(`      License: ${user.licenseType} ${user.licenseRating || ''} ${user.licenseNumber ? `(#${user.licenseNumber})` : ''}`);
          }
          if (user.checkedInAt) {
            const timestamp = user.checkedInAt.toDate ? user.checkedInAt.toDate() : new Date(user.checkedInAt.seconds * 1000);
            console.log(`      Checked in: ${timestamp.toLocaleString()}`);
          }
          console.log('');
        });
      }
    }

    console.log('='.repeat(80));
    console.log('END OF REPORT');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
