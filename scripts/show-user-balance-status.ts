import { getUserBalance } from '../lib/balanceService';

async function showUserBalanceStatus() {
  const userId = process.argv[2] || 'dKwmEBclVdd46rb5lxmSWuLCQwL2';

  console.log('================================================================================');
  console.log('USER BALANCE STATUS');
  console.log('================================================================================\n');

  console.log(`User ID: ${userId}\n`);

  const balance = await getUserBalance(userId);

  if (!balance) {
    console.log('❌ Unable to fetch balance');
    console.log('\nPossible reasons:');
    console.log('  • User does not exist');
    console.log('  • User is not checked in to a dropzone');
    console.log('  • Balance field does not exist in client document\n');
    process.exit(1);
  }

  console.log('✅ Balance Information');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(`   Current Balance: ${balance.balance} ${balance.currency}`);
  console.log(`   Currency: ${balance.currency}\n`);

  if (balance.balance === 0) {
    console.log('⚠️  No balance available');
    console.log('   • All purchases will be charged via payment method');
    console.log('   • No balance discount will be applied\n');
  } else {
    console.log('💰 Balance Available');
    console.log('   • Balance will be automatically applied to purchases');
    console.log('   • User will see balance deduction in cart\n');

    console.log('Example Purchase Scenarios:');
    console.log('────────────────────────────────────────────────────────────────────────────────');

    const scenarios = [
      { amount: Math.floor(balance.balance * 0.3), name: 'Small purchase' },
      { amount: Math.floor(balance.balance * 0.5), name: 'Medium purchase' },
      { amount: balance.balance, name: 'Full balance purchase' },
      { amount: Math.floor(balance.balance * 1.5), name: 'Over balance purchase' },
    ];

    scenarios.forEach(({ amount, name }) => {
      const applied = Math.min(balance.balance, amount);
      const charged = Math.max(0, amount - balance.balance);
      const newBalance = balance.balance - applied;
      const method = charged > 0 ? 'balance + card' : 'balance only';

      console.log(`\n${name}: ${amount} ${balance.currency}`);
      console.log(`  Balance applied: ${applied} ${balance.currency}`);
      console.log(`  Will charge: ${charged} ${balance.currency}`);
      console.log(`  New balance: ${newBalance} ${balance.currency}`);
      console.log(`  Payment: ${method}`);
    });
  }

  console.log('\n================================================================================\n');
  process.exit(0);
}

showUserBalanceStatus().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
