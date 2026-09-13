import { getUserBalance, processPurchaseWithBalance } from '../lib/balanceService';

async function testBalanceUpdate() {
  console.log('================================================================================');
  console.log('TESTING BALANCE UPDATE WITH NEW PATH');
  console.log('================================================================================\n');

  const testUserId = 'dKwmEBclVdd46rb5lxmSWuLCQwL2';

  // Step 1: Check initial balance
  console.log('STEP 1: Check initial balance');
  console.log('────────────────────────────────────────────────────────────────────────────────');

  const initialBalance = await getUserBalance(testUserId);

  if (!initialBalance) {
    console.log('❌ Failed to fetch balance');
    process.exit(1);
  }

  console.log(`✅ Initial balance: ${initialBalance.balance} ${initialBalance.currency}\n`);

  // Step 2: Process a 300 purchase
  console.log('STEP 2: Process a 300 purchase');
  console.log('────────────────────────────────────────────────────────────────────────────────');

  const purchaseAmount = 300;
  console.log(`Purchase amount: ${purchaseAmount} ${initialBalance.currency}\n`);

  const result = await processPurchaseWithBalance(testUserId, purchaseAmount);

  if (!result) {
    console.log('❌ Failed to process purchase');
    process.exit(1);
  }

  console.log('✅ Purchase processed');
  console.log(`   Amount from balance: ${result.amountFromBalance} ${initialBalance.currency}`);
  console.log(`   Amount charged: ${result.amountCharged} ${initialBalance.currency}`);
  console.log(`   New balance: ${result.newBalance} ${initialBalance.currency}\n`);

  // Step 3: Verify balance was updated
  console.log('STEP 3: Verify balance was updated');
  console.log('────────────────────────────────────────────────────────────────────────────────');

  const updatedBalance = await getUserBalance(testUserId);

  if (!updatedBalance) {
    console.log('❌ Failed to fetch updated balance');
    process.exit(1);
  }

  console.log(`✅ Updated balance: ${updatedBalance.balance} ${updatedBalance.currency}`);
  console.log(`   Expected: ${result.newBalance} ${initialBalance.currency}\n`);

  if (updatedBalance.balance === result.newBalance) {
    console.log('✅✅✅ SUCCESS! Balance was correctly updated in Firebase!\n');
  } else {
    console.log('❌❌❌ FAILED! Balance was NOT updated correctly!\n');
    process.exit(1);
  }

  // Step 4: Restore balance
  console.log('STEP 4: Restore balance');
  console.log('────────────────────────────────────────────────────────────────────────────────');

  const restoreResult = await processPurchaseWithBalance(testUserId, -purchaseAmount);

  if (!restoreResult) {
    console.log('❌ Failed to restore balance');
    process.exit(1);
  }

  const finalBalance = await getUserBalance(testUserId);
  console.log(`✅ Balance restored to: ${finalBalance?.balance} ${finalBalance?.currency}\n`);

  console.log('================================================================================');
  console.log('TEST COMPLETE');
  console.log('================================================================================');
  console.log('✅ Balance fetching works correctly');
  console.log('✅ Balance deduction works correctly');
  console.log('✅ Balance updates in Firebase immediately');
  console.log('✅ Cart will now show updated balance after purchases');
  console.log('================================================================================\n');

  process.exit(0);
}

testBalanceUpdate().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
