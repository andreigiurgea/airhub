import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkSpecificGiftCard() {
  try {
    const giftCardRef = doc(db, 'dropzones', 'V0A7np33p7aPLhVc6MZq', 'giftCards', 'k1WA9NyABQnlNEXuUXry');
    const giftCardSnap = await getDoc(giftCardRef);

    if (giftCardSnap.exists()) {
      const data = giftCardSnap.data();
      console.log('Full gift card data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('Gift card not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSpecificGiftCard();
