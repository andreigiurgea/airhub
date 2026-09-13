import { db } from '../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

async function checkGiftCardStructure() {
  try {
    // Get all dropzones
    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    console.log(`Found ${dropzonesSnapshot.size} dropzones`);

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      console.log(`\n📍 Dropzone: ${dropzoneDoc.id}`);

      // Get gift cards for this dropzone
      const giftCardsRef = collection(db, 'dropzones', dropzoneDoc.id, 'giftCards');
      const giftCardsSnapshot = await getDocs(query(giftCardsRef, limit(5)));

      console.log(`  Found ${giftCardsSnapshot.size} gift cards`);

      for (const giftCardDoc of giftCardsSnapshot.docs) {
        const giftCardData = giftCardDoc.data();
        console.log(`\n  🎁 Gift Card: ${giftCardDoc.id}`);
        console.log(`     Amount: ${giftCardData.amount}`);
        console.log(`     ProductName: ${giftCardData.productName || 'N/A'}`);
        console.log(`     Status: ${giftCardData.status}`);
        console.log(`     CustomerId: ${giftCardData.customerId}`);

        // Check includedProducts subcollection
        const includedProductsRef = collection(db, 'dropzones', dropzoneDoc.id, 'giftCards', giftCardDoc.id, 'includedProducts');
        const includedProductsSnapshot = await getDocs(includedProductsRef);

        console.log(`     IncludedProducts count: ${includedProductsSnapshot.size}`);

        if (!includedProductsSnapshot.empty) {
          includedProductsSnapshot.forEach(productDoc => {
            const productData = productDoc.data();
            console.log(`       - Product ID: ${productDoc.id}`);
            console.log(`         Product Name: ${productData.productName || productData.name || 'N/A'}`);
            console.log(`         All fields:`, productData);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkGiftCardStructure();
