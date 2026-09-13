import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

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

async function verifyPurchases() {
  console.log('\n=== CHECKING PURCHASES COLLECTION ===\n');

  try {
    const purchasesRef = collection(db, 'purchases');
    const purchasesQuery = query(purchasesRef, orderBy('purchasedAt', 'desc'), limit(10));
    const purchasesSnapshot = await getDocs(purchasesQuery);

    console.log(`Found ${purchasesSnapshot.size} purchases in the database\n`);

    purchasesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('---');
      console.log('Purchase ID:', doc.id);
      console.log('Customer ID:', data.customerId);
      console.log('Account ID:', data.accountId);
      console.log('Total Amount:', data.totalAmount, data.currency);
      console.log('Status:', data.status);
      console.log('Purchased At:', data.purchasedAt?.toDate?.() || 'N/A');
      console.log('Items:', data.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(', '));
      console.log('');
    });

    if (purchasesSnapshot.empty) {
      console.log('⚠️  No purchases found in the database.');
      console.log('This could mean:');
      console.log('1. No purchases have been made yet');
      console.log('2. Firebase security rules are blocking reads');
      console.log('3. There is an issue with the purchase flow\n');
    }

  } catch (error: any) {
    console.error('❌ Error fetching purchases:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
  }

  console.log('\n=== CHECKING CUSTOMERS WITH TICKETS ===\n');

  try {
    const customersRef = collection(db, 'customers');
    const customersSnapshot = await getDocs(customersRef);

    console.log(`Found ${customersSnapshot.size} customers\n`);

    for (const customerDoc of customersSnapshot.docs) {
      const customerData = customerDoc.data();
      const customerId = customerData.id;

      const ticketsRef = collection(db, 'customers', customerId, 'tickets');
      const ticketsSnapshot = await getDocs(ticketsRef);

      if (ticketsSnapshot.size > 0) {
        console.log('---');
        console.log('Customer ID:', customerId);
        console.log('Account ID:', customerData.accountId);
        console.log('Email:', customerData.email);
        console.log(`Tickets: ${ticketsSnapshot.size}`);

        ticketsSnapshot.forEach((ticketDoc) => {
          const ticketData = ticketDoc.data();
          console.log(`  - ${ticketData.quantity}x ${ticketData.ticketType} (${ticketData.currency} ${ticketData.price})`);
        });
        console.log('');
      }
    }

  } catch (error: any) {
    console.error('❌ Error fetching customer tickets:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
  }

  process.exit(0);
}

verifyPurchases();
