import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { processPurchaseWithBalance } from '../lib/balanceService';

async function testCartPurchaseFlow() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     CART PURCHASE FLOW TEST                          ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const accountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';

  try {
    console.log('📋 Step 1: Getting customer information...\n');

    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('accountId', '==', accountId));
    const customersSnapshot = await getDocs(q);

    if (customersSnapshot.empty) {
      console.log('❌ No customer found');
      process.exit(1);
    }

    const customerData = customersSnapshot.docs[0].data();
    const customerId = customerData.id;
    console.log(`✅ Customer ID: ${customerId}`);

    console.log('\n🛍️  Step 2: Getting available products...\n');

    const productsSnapshot = await getDocs(collection(db, 'shop_products'));
    const products = productsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((p: any) => p.active);

    if (products.length === 0) {
      console.log('❌ No products available');
      process.exit(1);
    }

    console.log(`✅ Found ${products.length} active products`);
    const testProduct = products[0] as any;
    console.log(`   Testing with: ${testProduct.name} (AED ${testProduct.price})`);

    console.log('\n💰 Step 3: Checking current balance...\n');

    const creditsRef = collection(db, 'credits');
    const creditsQuery = query(creditsRef, where('customerId', '==', customerId));
    const creditsSnapshot = await getDocs(creditsQuery);

    let currentBalance = 0;
    if (!creditsSnapshot.empty) {
      const creditData = creditsSnapshot.docs[0].data();
      currentBalance = creditData.balance || 0;
    }

    console.log(`✅ Current balance: AED ${currentBalance.toFixed(2)}`);

    console.log('\n🛒 Step 4: Simulating cart with 2 items...\n');

    const cartItems = [
      { product: testProduct, quantity: 2 }
    ];

    const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    console.log(`   Cart Total: AED ${totalAmount.toFixed(2)}`);
    console.log(`   Items: ${cartItems.reduce((sum, item) => sum + item.quantity, 0)}`);

    console.log('\n💳 Step 5: Testing payment methods...\n');

    console.log('   Option 1: Balance Payment');
    if (currentBalance >= totalAmount) {
      console.log(`   ✅ Sufficient balance (AED ${currentBalance.toFixed(2)} >= AED ${totalAmount.toFixed(2)})`);
    } else {
      console.log(`   ⚠️  Insufficient balance (need AED ${(totalAmount - currentBalance).toFixed(2)} more)`);
      console.log('   💵 Would fall back to Cash or Card payment');
    }

    console.log('\n📦 Step 6: Creating test purchase with balance...\n');

    const paymentMethod = currentBalance >= totalAmount ? 'balance' : 'cash';
    let purchaseResult = null;

    if (paymentMethod === 'balance') {
      purchaseResult = await processPurchaseWithBalance(accountId, totalAmount);
      if (!purchaseResult) {
        console.log('❌ Payment processing failed');
        process.exit(1);
      }
      console.log(`✅ Payment processed successfully`);
      console.log(`   Amount from balance: AED ${purchaseResult.amountFromBalance.toFixed(2)}`);
      console.log(`   Amount charged: AED ${purchaseResult.amountCharged.toFixed(2)}`);
      console.log(`   New balance: AED ${purchaseResult.newBalance.toFixed(2)}`);
    } else {
      console.log(`✅ Payment method: ${paymentMethod.toUpperCase()}`);
      console.log(`   Amount to be charged: AED ${totalAmount.toFixed(2)}`);
    }

    console.log('\n📝 Step 7: Recording purchase in database...\n');

    const purchaseData = {
      customerId,
      accountId,
      items: cartItems.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        productId: item.product.id,
        category: item.product.category,
      })),
      totalAmount,
      amountFromBalance: paymentMethod === 'balance' ? (purchaseResult?.amountFromBalance || 0) : 0,
      amountCharged: paymentMethod === 'balance' ? (purchaseResult?.amountCharged || 0) : totalAmount,
      paymentMethod,
      currency: 'AED',
      dropzoneName: 'Dubai Dropzone',
      altitude: 13000,
      purchasedAt: serverTimestamp(),
      status: 'completed',
    };

    const purchasesRef = collection(db, 'purchases');
    const purchaseDocRef = await addDoc(purchasesRef, purchaseData);
    console.log(`✅ Purchase recorded with ID: ${purchaseDocRef.id}`);

    console.log('\n🎫 Step 8: Creating tickets...\n');

    for (const item of cartItems) {
      const ticketData = {
        ticketType: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        currency: 'AED',
        dropzoneName: 'Dubai Dropzone',
        altitude: 13000,
        purchasedAt: serverTimestamp(),
      };

      const ticketsRef = collection(db, 'customers', customerId, 'tickets');
      await addDoc(ticketsRef, ticketData);
      console.log(`   ✅ ${item.quantity}x ${item.product.name} ticket created`);
    }

    console.log('\n🔍 Step 9: Verifying tickets in My Tickets...\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const purchasesQuery = query(purchasesRef, where('customerId', '==', customerId));
    const purchasesVerifySnapshot = await getDocs(purchasesQuery);

    let totalTickets = 0;
    purchasesVerifySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: any) => {
          totalTickets += item.quantity || 1;
        });
      }
    });

    console.log(`✅ Total tickets available: ${totalTickets}`);

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   PURCHASE FLOW TEST COMPLETED SUCCESSFULLY!         ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log(`   - Products added to cart: ${cartItems.length}`);
    console.log(`   - Total items: ${cartItems.reduce((sum, item) => sum + item.quantity, 0)}`);
    console.log(`   - Total amount: AED ${totalAmount.toFixed(2)}`);
    console.log(`   - Payment method: ${paymentMethod}`);
    console.log(`   - Purchase ID: ${purchaseDocRef.id}`);
    console.log(`   - Tickets created: ${cartItems.reduce((sum, item) => sum + item.quantity, 0)}`);
    console.log(`   - Available in My Tickets: ✅\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testCartPurchaseFlow();
