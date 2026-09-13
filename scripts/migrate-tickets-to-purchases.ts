import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdd_KkSJE9qA1Zbk7ueuZheBtCIqmb3po",
  authDomain: "skydive-boogie.firebaseapp.com",
  projectId: "skydive-boogie",
  storageBucket: "skydive-boogie.firebasestorage.app",
  messagingSenderId: "773256254342",
  appId: "1:773256254342:web:6e790d81a402a335f7d207"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateTicketsToPurchases() {
  console.log('\n=== MIGRATING TICKETS TO PURCHASES COLLECTION ===\n');

  try {
    const customersRef = collection(db, 'customers');
    const customersSnapshot = await getDocs(customersRef);

    let totalTicketsMigrated = 0;
    let totalPurchasesCreated = 0;

    for (const customerDoc of customersSnapshot.docs) {
      const customerData = customerDoc.data();
      const customerId = customerData.id;
      const accountId = customerData.accountId;

      const ticketsRef = collection(db, 'customers', customerId, 'tickets');
      const ticketsSnapshot = await getDocs(ticketsRef);

      if (ticketsSnapshot.size > 0) {
        console.log(`\nProcessing Customer: ${customerId} (${customerData.email})`);
        console.log(`Found ${ticketsSnapshot.size} tickets`);

        for (const ticketDoc of ticketsSnapshot.docs) {
          const ticketData = ticketDoc.data();

          const purchasesRef = collection(db, 'purchases');
          const purchaseData = {
            customerId,
            accountId,
            items: [
              {
                name: ticketData.ticketType || ticketData.name,
                quantity: ticketData.quantity || 1,
                price: ticketData.price || 0,
                productId: ticketDoc.id,
                category: 'tickets',
              },
            ],
            totalAmount: (ticketData.price || 0) * (ticketData.quantity || 1),
            currency: ticketData.currency || 'AED',
            dropzoneName: ticketData.dropzoneName || 'Dubai Dropzone',
            altitude: ticketData.altitude || 13000,
            purchasedAt: ticketData.purchasedAt || serverTimestamp(),
            status: 'completed',
            migratedFromTickets: true,
          };

          await addDoc(purchasesRef, purchaseData);
          totalTicketsMigrated++;
          console.log(`  ✓ Migrated: ${ticketData.quantity}x ${ticketData.ticketType}`);
        }

        totalPurchasesCreated++;
      }
    }

    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`Total customers processed: ${customersSnapshot.size}`);
    console.log(`Total tickets migrated: ${totalTicketsMigrated}`);
    console.log(`Total purchases created: ${totalPurchasesCreated}\n`);

  } catch (error: any) {
    console.error('❌ Error during migration:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
  }

  process.exit(0);
}

migrateTicketsToPurchases();
