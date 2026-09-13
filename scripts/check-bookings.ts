import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING BOOKINGS COLLECTION');
  console.log('='.repeat(80));

  try {
    const bookingsRef = collection(db, 'bookings');
    const snapshot = await getDocs(bookingsRef);

    console.log(`\nFound ${snapshot.size} bookings\n`);

    if (snapshot.size === 0) {
      console.log('No bookings found in the database.');
      console.log('\nTrying alternative collection names...\n');

      const alternatives = ['booking', 'reservations', 'appointments', 'schedules'];
      for (const alt of alternatives) {
        try {
          const altRef = collection(db, alt);
          const altSnapshot = await getDocs(altRef);
          if (altSnapshot.size > 0) {
            console.log(`✅ Found ${altSnapshot.size} documents in '${alt}' collection`);
            altSnapshot.docs.forEach(doc => {
              console.log(`   - ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
            });
          }
        } catch (e) {
          // Collection doesn't exist
        }
      }
    } else {
      snapshot.forEach((doc) => {
        console.log(`\nBooking ID: ${doc.id}`);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    }

  } catch (error) {
    console.error('Error checking bookings:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
})();
