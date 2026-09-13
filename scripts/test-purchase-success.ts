import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testPurchaseSuccess() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     PURCHASE SUCCESS SCREEN TEST                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    console.log('📋 Step 1: Getting test customer...');
    const customersRef = collection(db, 'customers');
    const customersSnapshot = await getDocs(customersRef);

    if (customersSnapshot.empty) {
      console.log('❌ No customers found');
      return;
    }

    const customerDoc = customersSnapshot.docs[0];
    const customerData = customerDoc.data();
    const customerId = customerData.id;
    const accountId = customerData.accountId;

    console.log(`✅ Customer ID: ${customerId}\n`);

    console.log('🛍️  Step 2: Creating test purchase...');
    const testPurchase = {
      customerId,
      accountId,
      items: [
        {
          name: 'Tandem Jump',
          quantity: 2,
          price: 1200,
          productId: 'test_product_1',
          category: 'jumps',
        },
        {
          name: 'Goggles Rental',
          quantity: 1,
          price: 19,
          productId: 'test_product_2',
          category: 'equipment',
        },
      ],
      totalAmount: 2419,
      amountFromBalance: 0,
      amountCharged: 2419,
      paymentMethod: 'card',
      currency: 'AED',
      dropzoneName: 'Dubai Dropzone',
      altitude: 13000,
      purchasedAt: serverTimestamp(),
      status: 'completed',
    };

    const purchasesRef = collection(db, 'purchases');
    const purchaseDocRef = await addDoc(purchasesRef, testPurchase);
    const purchaseId = purchaseDocRef.id;

    console.log(`✅ Purchase created with ID: ${purchaseId}\n`);

    console.log('📄 Step 3: Generating success screen data...');
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const successData = {
      refNumber: purchaseId.substring(0, 10).toUpperCase(),
      date: formattedDate,
      method: testPurchase.paymentMethod,
      totalPaid: testPurchase.totalAmount.toFixed(2),
      items: testPurchase.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
      })),
      currency: testPurchase.currency,
    };

    console.log('✅ Success screen data generated:\n');
    console.log('   📌 Reference Number:', successData.refNumber);
    console.log('   📅 Date:', successData.date);
    console.log('   💳 Payment Method:', successData.method);
    console.log('   💰 Total Paid:', successData.currency, successData.totalPaid);
    console.log('   📦 Items:', successData.items.length);
    successData.items.forEach((item, index) => {
      console.log(`      ${index + 1}. ${item.quantity}x ${item.name}`);
    });

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   SUCCESS SCREEN DATA READY!                         ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('📱 Success Screen will display:');
    console.log('   ✅ Green checkmark icon');
    console.log('   🎉 "Thank You!" message');
    console.log('   📋 Payment details section');
    console.log('   📦 Product icons/images');
    console.log('   🔢 Reference number');
    console.log('   📅 Date and time');
    console.log('   💳 Payment method');
    console.log('   💰 Total amount');
    console.log('   📄 PDF receipt button');
    console.log('   🛒 Continue shopping button');

    console.log('\n🎨 Screen Design:');
    console.log('   - Dark theme (black background)');
    console.log('   - Professional layout');
    console.log('   - Clear typography');
    console.log('   - Green accent color for success');
    console.log('   - Yellow/green "Continue shopping" button');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testPurchaseSuccess();
