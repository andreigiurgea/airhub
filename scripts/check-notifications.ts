import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING NOTIFICATIONS COLLECTION');
  console.log('='.repeat(80));

  try {
    const notificationsRef = collection(db, 'notifications');
    const snapshot = await getDocs(notificationsRef);

    console.log(`\nFound ${snapshot.size} notifications\n`);

    if (snapshot.size === 0) {
      console.log('No notifications found in the database.');
    } else {
      snapshot.forEach((doc) => {
        console.log(`\nNotification ID: ${doc.id}`);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    }

  } catch (error) {
    console.error('Error checking notifications:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
})();
