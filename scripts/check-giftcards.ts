import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkGiftCards() {
  try {
    console.log('Checking gift cards in all dropzones...\n');

    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnap = await getDocs(dropzonesRef);

    for (const dropzoneDoc of dropzonesSnap.docs) {
      const dropzoneId = dropzoneDoc.id;
      const dropzoneName = dropzoneDoc.data().name;

      console.log(`\n=== ${dropzoneName} (${dropzoneId}) ===`);

      const giftCardsRef = collection(db, 'dropzones', dropzoneId, 'giftCards');
      const giftCardsSnap = await getDocs(giftCardsRef);

      if (giftCardsSnap.empty) {
        console.log('  No gift cards found');
      } else {
        console.log(`  Found ${giftCardsSnap.size} gift cards:\n`);

        giftCardsSnap.docs.forEach((doc) => {
          const data = doc.data();
          console.log(`  Code: ${doc.id}`);
          console.log(`    Full Data:`, JSON.stringify(data, null, 2));
          console.log('');
        });
      }
    }

    console.log('\n✅ Gift card check complete');
  } catch (error) {
    console.error('Error checking gift cards:', error);
  }
}

checkGiftCards();
