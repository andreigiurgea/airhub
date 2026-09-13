import { getUserBalance, processPurchaseWithBalance } from '../lib/balanceService';

async function demoPurchaseFlow() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║       PURCHASE WITH BALANCE DEDUCTION DEMO           ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const accountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';

  const initialBalance = await getUserBalance(accountId);
  if (!initialBalance) {
    console.log('❌ Could not fetch balance');
    process.exit(1);
  }

  console.log('📊 Initial State');
  console.log('─────────────────────────────────────────────────────');
  console.log(`💰 Available Balance: ${initialBalance.balance} ${initialBalance.currency}\n`);

  console.log('🛒 Purchase: 2x Belly Flying @ 350 AED each');
  console.log('─────────────────────────────────────────────────────');
  const purchaseAmount = 350 * 2;
  console.log(`📦 Total Purchase Amount: ${purchaseAmount} AED\n`);

  console.log('💳 Processing Payment...');
  const result = await processPurchaseWithBalance(accountId, purchaseAmount);

  if (!result) {
    console.log('❌ Payment processing failed');
    process.exit(1);
  }

  console.log('─────────────────────────────────────────────────────');
  console.log('✅ Payment Breakdown:');
  console.log(`   💵 Paid from Balance: ${result.amountFromBalance} AED`);
  console.log(`   💳 Charged: ${result.amountCharged} AED`);
  console.log(`   💰 New Balance: ${result.newBalance} AED\n`);

  if (result.amountFromBalance === purchaseAmount) {
    console.log('🎉 Purchase fully covered by available balance!');
  } else if (result.amountFromBalance > 0) {
    console.log('✨ Partial payment from balance, remaining amount charged.');
  } else {
    console.log('💳 Full amount charged (no balance available).');
  }

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                  PURCHASE COMPLETE                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

demoPurchaseFlow();
