import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function testCustomerValidation() {
  try {
    console.log('Testing gift card customer validation...\n');

    const dropzoneId = 'V0A7np33p7aPLhVc6MZq'; // Abu Dhabi

    // Test scenarios
    const testCases = [
      {
        code: 'SKY-B8RJT2',
        testCustomerId: 'C1185158',
        description: 'Correct customer (C1185158 for thisisandrei)'
      },
      {
        code: 'SKY-B8RJT2',
        testCustomerId: 'C1234567',
        description: 'Wrong customer (different ID)'
      },
      {
        code: 'SKY-NESTED-TEST',
        testCustomerId: 'C1234567',
        description: 'Unassigned gift card (no customerId field)'
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n📋 Test: ${testCase.description}`);
      console.log(`   Code: ${testCase.code}`);
      console.log(`   Test Customer ID: ${testCase.testCustomerId}`);

      const giftCardsRef = collection(db, 'dropzones', dropzoneId, 'giftCards');
      const q = query(giftCardsRef, where('code', '==', testCase.code));
      const giftCardsSnap = await getDocs(q);

      if (giftCardsSnap.empty) {
        console.log('   ❌ Gift card not found');
        continue;
      }

      const giftCardData = giftCardsSnap.docs[0].data();

      console.log(`   Gift Card customerId: ${giftCardData.customerId || 'null (unassigned)'}`);
      console.log(`   Assigned to: ${giftCardData.assignedToName || 'None'}`);

      // Validation logic (matches cart.tsx)
      if (giftCardData.status !== 'active') {
        console.log('   ❌ FAIL: Gift card is not active');
      } else if (giftCardData.redeemed) {
        console.log('   ❌ FAIL: Gift card has already been used');
      } else if (giftCardData.customerId && giftCardData.customerId !== testCase.testCustomerId) {
        console.log('   ❌ FAIL: Gift card is not assigned to this customer');
        console.log(`      (Expected: ${giftCardData.customerId}, Got: ${testCase.testCustomerId})`);
      } else {
        console.log('   ✅ PASS: Customer can use this gift card');
      }
    }

    console.log('\n✅ Customer validation test complete');
  } catch (error) {
    console.error('Error testing validation:', error);
  }
}

testCustomerValidation();
