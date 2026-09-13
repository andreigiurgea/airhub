import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('ADDING MULTIPLE TEST NOTIFICATIONS');
  console.log('='.repeat(80));

  try {
    const notificationsRef = collection(db, 'notifications');

    const notifications = [
      {
        title: 'New Jump Scheduled',
        description: 'Your tandem jump has been scheduled for tomorrow at 10:00 AM',
        type: 'success',
        isUnread: true,
        createdAt: Timestamp.now(),
      },
      {
        title: 'Weather Alert',
        description: 'High winds expected. Please check with your instructor before arrival',
        type: 'warning',
        isUnread: true,
        createdAt: Timestamp.now(),
      },
      {
        title: 'Payment Received',
        description: 'Your payment of AED 1,799 has been successfully processed',
        type: 'success',
        isUnread: true,
        createdAt: Timestamp.now(),
      },
    ];

    for (const notification of notifications) {
      const docRef = await addDoc(notificationsRef, notification);
      console.log(`\n✅ Added: ${notification.title}`);
      console.log(`   ID: ${docRef.id}`);
    }

    console.log('\n✅ All test notifications added successfully!');
    console.log(`Total added: ${notifications.length}`);

  } catch (error) {
    console.error('Error adding notifications:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
})();
