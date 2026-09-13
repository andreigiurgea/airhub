import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('ADDING TEST NOTIFICATION');
  console.log('='.repeat(80));

  try {
    const notificationsRef = collection(db, 'notifications');

    const notification = {
      title: 'Test Notification',
      description: 'This is a test notification to verify the badge counter',
      type: 'info',
      isUnread: true,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(notificationsRef, notification);

    console.log('\n✅ Test notification added successfully!');
    console.log('ID:', docRef.id);
    console.log('Data:', JSON.stringify(notification, null, 2));

  } catch (error) {
    console.error('Error adding notification:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
})();
