import { db } from '../lib/firebase';
import { processPurchaseWithBalance, getUserBalance } from '../lib/balanceService';
import { collection, getDocs, query, where } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING PURCHASE WITH BALANCE');
    console.log('='.repeat(80) + '\n');

    const testAccountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';

    const customersRef = collection(db, 'customers');
    const customerQuery = query(customersRef, where('accountId', '==', testAccountId));
    const customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('❌ Customer not found');
      process.exit(1);
    }

    const customerData = customerSnapshot.docs[0].data();
    if (!customerData.currentDropzone) {
      console.log('❌ Not checked in');
      process.exit(1);
    }

    console.log(`✅ Checked into: ${customerData.currentDropzone.dropzoneName}`);

    console.log('\n2. Getting initial balance...');
    const initialBalanceData = await getUserBalance(testAccountId);
    if (!initialBalanceData) {
      console.log('❌ Failed to get balance');
      process.exit(1);
    }

    console.log(`✅ Initial balance: ${initialBalanceData.balance} ${initialBalanceData.currency}`);

    const purchaseAmount = 50;
    console.log(`\n3. Processing test purchase of ${purchaseAmount} AED...`);
    const result = await processPurchaseWithBalance(testAccountId, purchaseAmount);

    if (!result) {
      console.log('❌ Purchase failed');
      process.exit(1);
    }

    console.log('✅ Purchase processed successfully');
    console.log(`   Amount from balance: ${result.amountFromBalance} AED`);
    console.log(`   Amount charged: ${result.amountCharged} AED`);
    console.log(`   New balance: ${result.newBalance} AED`);

    console.log('\n4. Verifying new balance...');
    const newBalanceData = await getUserBalance(testAccountId);
    if (!newBalanceData) {
      console.log('❌ Failed to get new balance');
      process.exit(1);
    }

    console.log(`✅ Updated balance: ${newBalanceData.balance} ${newBalanceData.currency}`);

    const expectedBalance = initialBalanceData.balance - result.amountFromBalance;
    if (newBalanceData.balance === expectedBalance) {
      console.log('✅ Balance calculation is correct');
    } else {
      console.log(`❌ Balance mismatch: expected ${expectedBalance}, got ${newBalanceData.balance}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
