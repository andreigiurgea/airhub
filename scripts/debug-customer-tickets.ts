import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function debugCustomerTickets() {
  try {
    console.log('🔍 Checking Firebase database for customers and tickets...\n');

    const customersSnapshot = await getDocs(collection(db, 'customers'));
    console.log(`📊 Found ${customersSnapshot.size} customers\n`);

    if (customersSnapshot.empty) {
      console.log('❌ No customers found in database');
      return;
    }

    for (const customerDoc of customersSnapshot.docs) {
      const customerData = customerDoc.data();
      const customerId = customerData.id || customerDoc.id;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 CUSTOMER: ${customerId}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   📧 Email: ${customerData.email || 'N/A'}`);
      console.log(`   🆔 Account ID: ${customerData.accountId || 'N/A'}`);
      console.log(`   👤 Name: ${customerData.firstName || ''} ${customerData.lastName || ''}`);
      console.log(`   📱 Phone: ${customerData.phone || 'N/A'}`);
      console.log(`   📍 Status: ${customerData.status || 'N/A'}`);

      const ticketsRef = collection(db, 'customers', customerId, 'tickets');
      const ticketsSnapshot = await getDocs(ticketsRef);

      console.log(`\n   🎫 TICKETS: ${ticketsSnapshot.size} found`);

      if (ticketsSnapshot.size > 0) {
        ticketsSnapshot.forEach((ticketDoc, index) => {
          const ticketData = ticketDoc.data();
          console.log(`\n   ┌─ Ticket #${index + 1} (${ticketDoc.id})`);
          console.log(`   │  Type: ${ticketData.ticketType || ticketData.name || 'Unknown'}`);
          console.log(`   │  Dropzone: ${ticketData.dropzoneName || ticketData.dropzone || 'Unknown'}`);
          console.log(`   │  Quantity: ${ticketData.quantity || 0}`);
          console.log(`   │  Price: ${ticketData.currency || 'AED'} ${ticketData.price || 0}`);
          console.log(`   │  Altitude: ${ticketData.altitude ? ticketData.altitude + 'ft' : 'N/A'}`);
          console.log(`   │  Purchased: ${ticketData.purchasedAt ? new Date(ticketData.purchasedAt.seconds * 1000).toLocaleString() : 'N/A'}`);
          console.log(`   └─ Raw Data: ${JSON.stringify(ticketData, null, 4).replace(/\n/g, '\n      ')}`);
        });
      } else {
        console.log('   └─ No tickets in subcollection');
      }

      console.log('\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database scan complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCustomerTickets();
