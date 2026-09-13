import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testAnnouncements() {
  console.log('Testing Announcements Feature\n');

  // Check if announcements collection exists
  console.log('1. Checking existing announcements...');
  const announcementsRef = collection(db, 'announcements');
  const q = query(announcementsRef, orderBy('createdAt', 'desc'), limit(5));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('   No announcements found. Creating sample announcements...\n');
  } else {
    console.log(`   Found ${snapshot.size} announcement(s):`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`   - [${data.priority.toUpperCase()}] ${data.title}`);
      console.log(`     ${data.message}`);
      console.log(`     Created: ${data.createdAt?.toDate?.() || 'N/A'}\n`);
    });
  }

  // Add sample announcements
  console.log('2. Adding test announcements...\n');

  const testAnnouncements = [
    {
      title: 'Weather Alert',
      message: 'High winds expected this afternoon. Jumping may be suspended after 3 PM.',
      priority: 'high',
      createdAt: Timestamp.now(),
    },
    {
      title: 'New Course Available',
      message: 'Advanced Freefly course starts next Monday. Sign up at the front desk!',
      priority: 'medium',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 60000)), // 1 minute ago
    },
    {
      title: 'Dropzone Hours Extended',
      message: 'We are now open until 8 PM on weekends throughout the summer season.',
      priority: 'low',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 120000)), // 2 minutes ago
    },
  ];

  for (const announcement of testAnnouncements) {
    const docRef = await addDoc(announcementsRef, announcement);
    console.log(`   ✓ Added [${announcement.priority.toUpperCase()}]: ${announcement.title} (ID: ${docRef.id})`);
  }

  console.log('\n3. Verifying latest announcement...');
  const latestQ = query(announcementsRef, orderBy('createdAt', 'desc'), limit(1));
  const latestSnapshot = await getDocs(latestQ);

  if (!latestSnapshot.empty) {
    const latest = latestSnapshot.docs[0].data();
    console.log(`   Latest announcement: [${latest.priority.toUpperCase()}] ${latest.title}`);
    console.log(`   Message: ${latest.message}`);
  }

  console.log('\n✓ Test complete! The app should now display the latest announcement.');
  console.log('\nNote: The announcement card will update in real-time when new announcements are added to Firebase.');
}

testAnnouncements().catch(console.error);
