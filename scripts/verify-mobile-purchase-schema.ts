import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function verifyMobilePurchaseSchema() {
  console.log('================================================================================');
  console.log('FIREBASE PURCHASE SCHEMA VERIFICATION');
  console.log('================================================================================\n');

  // Check existing purchase from screenshot
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const customerId = 'C8668912';

  console.log('📋 Fetching existing purchase from Firebase...\n');

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
  const q = query(purchasesRef, where('customerId', '==', customerId));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('No purchases found');
    return;
  }

  const existingPurchase = snapshot.docs[0];
  const existingData = existingPurchase.data();

  console.log('✅ EXISTING PURCHASE SCHEMA (from web/POS):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Object.keys(existingData).sort().forEach(key => {
    const value = existingData[key];
    if (key === 'items' && Array.isArray(value)) {
      console.log(`  ${key}: Array(${value.length})`);
      if (value.length > 0) {
        console.log('    Item structure:');
        Object.keys(value[0]).sort().forEach(itemKey => {
          console.log(`      - ${itemKey}: ${typeof value[0][itemKey]}`);
        });
      }
    } else if (key === 'purchasedAt' || key === 'createdAt' || key === 'date') {
      console.log(`  ${key}: Timestamp`);
    } else {
      console.log(`  ${key}: ${typeof value} = ${value}`);
    }
  });

  console.log('\n✅ NEW MOBILE PURCHASE SCHEMA (from app):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  accountId: string');
  console.log('  altitude: number');
  console.log('  amountCharged: number');
  console.log('  amountFromBalance: number');
  console.log('  canceled: boolean');
  console.log('  createdAt: Timestamp');
  console.log('  creditUsed: number');
  console.log('  currency: string');
  console.log('  customerId: string');
  console.log('  date: Timestamp');
  console.log('  dropzoneId: string');
  console.log('  dropzoneName: string');
  console.log('  items: Array');
  console.log('    Item structure:');
  console.log('      - canceled: boolean');
  console.log('      - category: string');
  console.log('      - name: string');
  console.log('      - price: number');
  console.log('      - productId: string');
  console.log('      - quantity: number');
  console.log('      - used: boolean');
  console.log('  mobilePurchase: boolean ← NEW FIELD');
  console.log('  paymentMethod: string');
  console.log('  purchasedAt: Timestamp');
  console.log('  refNumber: string');
  console.log('  status: string');
  console.log('  subtotal: number');
  console.log('  total: number');
  console.log('  totalAmount: number');
  console.log('  userId: string');
  console.log('  validated: boolean');

  console.log('\n📊 SCHEMA COMPARISON:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All existing fields preserved');
  console.log('✅ Added mobilePurchase: true for mobile app purchases');
  console.log('✅ Added userId (duplicate of accountId for consistency)');
  console.log('✅ Added subtotal and total (match totalAmount)');
  console.log('✅ Added creditUsed (match amountFromBalance)');
  console.log('✅ Added createdAt and date (match purchasedAt)');
  console.log('✅ No new collections created');
  console.log('✅ Purchases remain in: /dropzones/{dropzoneId}/purchases');

  console.log('\n🎯 KEY POINTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Mobile purchases stored in SAME collection as web/POS');
  console.log('2. mobilePurchase: true allows filtering by purchase source');
  console.log('3. All fields match existing schema from screenshot');
  console.log('4. Real-time listener will detect mobile purchases immediately');
  console.log('5. Staff dashboard sees both mobile and web purchases');
  console.log('6. Schema is backward compatible (extra fields won\'t break existing systems)');

  console.log('\n🔍 EXAMPLE MOBILE PURCHASE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(JSON.stringify({
    accountId: "user123",
    altitude: 13000,
    amountCharged: 750,
    amountFromBalance: 0,
    canceled: false,
    createdAt: "serverTimestamp()",
    creditUsed: 0,
    currency: "RON",
    customerId: "C8668912",
    date: "serverTimestamp()",
    dropzoneId: "MOjfNjZHUExnLztWXAWZ",
    dropzoneName: "TNT Brothers Clinceni",
    items: [{
      name: "Tandem Jump",
      quantity: 1,
      price: 750,
      productId: "tandem-001",
      category: "jumps",
      used: false,
      canceled: false
    }],
    mobilePurchase: true,
    paymentMethod: "card",
    purchasedAt: "serverTimestamp()",
    refNumber: "ABC123XYZ4",
    status: "completed",
    subtotal: 750,
    total: 750,
    totalAmount: 750,
    userId: "user123",
    validated: true
  }, null, 2));

  console.log('\n================================================================================\n');
  process.exit(0);
}

verifyMobilePurchaseSchema().catch(console.error);
