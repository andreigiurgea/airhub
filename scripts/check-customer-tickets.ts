import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function checkCustomerTickets() {
  const accountId = 'dKwmEBclVdd46rb5lxmSWuLCQwL2';  // andrei2@logix.com

  console.log('================================================================================');
  console.log('CHECKING CUSTOMER TICKETS');
  console.log('================================================================================\n');

  // Get customer
  const customersRef = collection(db, 'customers');
  const customerQuery = query(customersRef, where('accountId', '==', accountId));
  const customerSnapshot = await getDocs(customerQuery);

  if (customerSnapshot.empty) {
    console.log('❌ No customer found');
    return;
  }

  const customerData = customerSnapshot.docs[0].data();
  console.log('Customer:', customerData.firstName, customerData.lastName);
  console.log('Customer ID:', customerData.id);
  console.log('Account ID:', customerData.accountId);

  if (!customerData.currentDropzone) {
    console.log('\n❌ Not checked in');
    return;
  }

  console.log('\nCurrent Dropzone:', customerData.currentDropzone.dropzoneName);
  console.log('Dropzone ID:', customerData.currentDropzone.dropzoneId);

  const dropzoneId = customerData.currentDropzone.dropzoneId;
  const customerId = customerData.id;

  // Find all client records for this customer in this dropzone
  console.log('\n--- Searching for client records ---');
  const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
  const customersQuery = query(customersRef, where('customerId', '==', customerId));
  const customersSnapshot = await getDocs(customersQuery);

  console.log('Client records found:', customersSnapshot.size);

  for (const customerDoc of customersSnapshot.docs) {
    const customerData = customerDoc.data();
    console.log('\nClient ID:', customerDoc.id);
    console.log('Customer ID:', customerData.customerId);

    // Check purchases
    const purchasesRef = collection(db, 'dropzones', dropzoneId, 'customers', customerDoc.id, 'purchases');
    const purchasesSnapshot = await getDocs(purchasesRef);
    console.log('Purchases:', purchasesSnapshot.size);

    purchasesSnapshot.forEach((purchaseDoc) => {
      const purchase = purchaseDoc.data();
      console.log('  - Purchase:', purchase.name, 'Qty:', purchase.quantity, 'Category:', purchase.categoryId);
    });

    // Check tickets (old system)
    const ticketsRef = collection(db, 'dropzones', dropzoneId, 'customers', customerDoc.id, 'tickets');
    const ticketsSnapshot = await getDocs(ticketsRef);
    console.log('Tickets (old):', ticketsSnapshot.size);

    ticketsSnapshot.forEach((ticketDoc) => {
      const ticket = ticketDoc.data();
      console.log('  - Ticket:', JSON.stringify(ticket, null, 2));
    });
  }

  console.log('\n================================================================================');
}

checkCustomerTickets().catch(console.error);
