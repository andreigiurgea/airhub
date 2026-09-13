import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function testGiftCardValidation() {
  try {
    console.log('Testing gift card validation logic...\n');

    const dropzoneId = 'V0A7np33p7aPLhVc6MZq';
    const testCodes = ['SKY-DDT3KY', 'SKY-UK2APM', 'INVALID-CODE'];

    for (const testCode of testCodes) {
      console.log(`Testing code: ${testCode}`);

      const giftCardsRef = collection(db, 'dropzones', dropzoneId, 'giftCards');
      const q = query(giftCardsRef, where('code', '==', testCode));
      const giftCardsSnap = await getDocs(q);

      if (giftCardsSnap.empty) {
        console.log('  ❌ Invalid coupon code\n');
        continue;
      }

      const giftCardDoc = giftCardsSnap.docs[0];
      const giftCardData = giftCardDoc.data();

      console.log('  ✅ Found gift card!');
      console.log(`     Status: ${giftCardData.status}`);
      console.log(`     Redeemed: ${giftCardData.redeemed}`);
      console.log(`     Amount: ${giftCardData.amount} ${giftCardData.currency}`);
      console.log(`     Expires: ${giftCardData.expiresAt}`);

      if (giftCardData.status !== 'active') {
        console.log('  ⚠️  Coupon is not active');
      }

      if (giftCardData.redeemed) {
        console.log('  ⚠️  Coupon has already been used');
      }

      if (giftCardData.expiresAt) {
        const expiryDate = new Date(giftCardData.expiresAt);
        const now = new Date();
        if (expiryDate < now) {
          console.log('  ⚠️  Coupon has expired');
        } else {
          console.log(`  ✅ Valid until ${expiryDate.toLocaleDateString()}`);
        }
      }

      console.log('');
    }

    console.log('✅ Validation test complete');
  } catch (error) {
    console.error('Error testing validation:', error);
  }
}

testGiftCardValidation();
