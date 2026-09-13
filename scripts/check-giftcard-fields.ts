import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkGiftCardFields() {
  try {
    console.log('Checking gift card field structure...\n');

    const dropzoneId = 'V0A7np33p7aPLhVc6MZq'; // Abu Dhabi
    const giftCardsRef = collection(db, 'dropzones', dropzoneId, 'giftCards');
    const snapshot = await getDocs(giftCardsRef);

    if (snapshot.empty) {
      console.log('No gift cards found');
      return;
    }

    console.log(`Found ${snapshot.size} gift cards\n`);

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n=== Gift Card ${index + 1} ===`);
      console.log(`ID: ${doc.id}`);
      console.log(`Code: ${data.code}`);
      console.log('\nAll fields:');
      console.log(JSON.stringify(data, null, 2));

      // Check for customer-related fields
      console.log('\n🔍 Customer-related fields:');
      if ('customerId' in data) {
        console.log(`   customerId: ${data.customerId}`);
      }
      if ('assignedCustomerId' in data) {
        console.log(`   assignedCustomerId: ${data.assignedCustomerId}`);
      }
      if ('assignedToName' in data) {
        console.log(`   assignedToName: ${data.assignedToName}`);
      }
      if ('redeemedByCustomerId' in data) {
        console.log(`   redeemedByCustomerId: ${data.redeemedByCustomerId}`);
      }
      if ('purchasedByCustomerId' in data) {
        console.log(`   purchasedByCustomerId: ${data.purchasedByCustomerId}`);
      }
    });

  } catch (error) {
    console.error('Error checking gift cards:', error);
  }
}

checkGiftCardFields();
