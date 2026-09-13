import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function showCurrentPurchases() {
  const customerId = 'C8668912'; // andrei2@logix.com
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

  console.log('================================================================================');
  console.log('CURRENT PURCHASES FOR andrei2@logix.com');
  console.log('================================================================================\n');

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
  const purchasesQuery = query(purchasesRef, where('customerId', '==', customerId));
  const snapshot = await getDocs(purchasesQuery);

  console.log(`Total purchases: ${snapshot.size}\n`);

  let activeCount = 0;
  let usedCount = 0;
  let canceledCount = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`📦 Purchase: ${doc.id}`);
    console.log(`   Date: ${data.purchasedAt?.toDate?.() || 'N/A'}`);
    console.log(`   Total: ${data.totalAmount} ${data.currency}`);
    console.log(`   Payment: ${data.paymentMethod}`);
    console.log(`   Items:`);

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any, idx: number) => {
        let status = '● Active';
        if (item.used) {
          status = '✓ Used';
          usedCount++;
        } else if (item.canceled) {
          status = '✗ Canceled';
          canceledCount++;
        } else {
          activeCount++;
        }
        console.log(`      ${idx + 1}. ${status} - ${item.name} x${item.quantity} @ ${item.price} ${data.currency}`);
      });
    }
    console.log('');
  });

  console.log('================================================================================');
  console.log('SUMMARY');
  console.log('================================================================================');
  console.log(`● Active items (will display): ${activeCount}`);
  console.log(`✓ Used items: ${usedCount}`);
  console.log(`✗ Canceled items: ${canceledCount}`);
  console.log('================================================================================\n');
}

showCurrentPurchases().catch(console.error);
