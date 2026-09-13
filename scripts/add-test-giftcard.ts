import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';

async function addTestGiftCard() {
  try {
    console.log('Adding test gift card...\n');

    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnap = await getDocs(dropzonesRef);

    if (dropzonesSnap.empty) {
      console.log('No dropzones found');
      return;
    }

    const firstDropzone = dropzonesSnap.docs[0];
    const dropzoneId = firstDropzone.id;
    const dropzoneName = firstDropzone.data().name;

    console.log(`Adding gift cards to: ${dropzoneName} (${dropzoneId})\n`);

    const giftCards = [
      {
        code: 'WELCOME50',
        type: 'percentage',
        discount: 50,
        active: true,
        used: false,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      },
      {
        code: 'GIFT100',
        type: 'fixed',
        value: 100,
        active: true,
        used: false,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
      },
      {
        code: 'FREEBIE',
        type: 'percentage',
        discount: 100,
        active: true,
        used: false,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      },
    ];

    for (const giftCard of giftCards) {
      const giftCardRef = doc(db, 'dropzones', dropzoneId, 'giftCards', giftCard.code);
      await setDoc(giftCardRef, {
        ...giftCard,
        createdAt: Timestamp.now(),
      });
      console.log(`✅ Added gift card: ${giftCard.code}`);
      console.log(`   Type: ${giftCard.type}`);
      console.log(`   Value: ${giftCard.discount || giftCard.value}${giftCard.type === 'percentage' ? '%' : ''}`);
      console.log(`   Expires: ${giftCard.expiresAt.toDate().toLocaleDateString()}\n`);
    }

    console.log('✅ Test gift cards added successfully');
  } catch (error) {
    console.error('Error adding test gift cards:', error);
  }
}

addTestGiftCard();
