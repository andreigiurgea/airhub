import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getUserBalance } from '../lib/balanceService';

async function testBalanceService() {
  console.log('Testing Balance Service...\n');

  try {
    const customersRef = collection(db, 'customers');
    const customersSnapshot = await getDocs(customersRef);

    let testedCount = 0;

    for (const doc of customersSnapshot.docs) {
      const customerData = doc.data();

      if (customerData.accountId) {
        console.log(`\n--- Testing Customer: ${doc.id} ---`);
        console.log(`Email: ${customerData.email}`);
        console.log(`Account ID: ${customerData.accountId}`);

        const balanceData = await getUserBalance(customerData.accountId);

        if (balanceData) {
          console.log(`✓ Balance: ${balanceData.balance} ${balanceData.currency}`);
          console.log(`✓ Total Credits: ${balanceData.totalCredits} ${balanceData.currency}`);
          console.log(`✓ Total Purchases: ${balanceData.totalPurchases} ${balanceData.currency}`);
          console.log(`✓ Ticket Count: ${balanceData.ticketCount}`);
        } else {
          console.log('✗ No balance data found');
        }

        testedCount++;

        if (testedCount >= 3) {
          break;
        }
      }
    }

    console.log('\n✓ Balance Service test completed!');
  } catch (error) {
    console.error('Error testing balance service:', error);
  }

  process.exit(0);
}

testBalanceService();
