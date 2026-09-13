import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkForTicketsCollections() {
  console.log('================================================================================');
  console.log('CHECKING FOR TICKETS COLLECTIONS');
  console.log('================================================================================\n');

  console.log('Scanning dropzones for tickets collections...\n');

  const dropzonesRef = collection(db, 'dropzones');
  const dropzonesSnapshot = await getDocs(dropzonesRef);

  let foundTickets = false;

  for (const dropzoneDoc of dropzonesSnapshot.docs) {
    const dropzoneId = dropzoneDoc.id;
    const dropzoneName = dropzoneDoc.data().name;

    console.log(`Checking ${dropzoneName}...`);

    // Check for clients collection
    const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const customersSnapshot = await getDocs(customersRef);

    if (customersSnapshot.empty) {
      console.log('  No clients found');
      continue;
    }

    console.log(`  Found ${customersSnapshot.size} clients`);

    // Check each client for tickets subcollection
    for (const customerDoc of customersSnapshot.docs) {
      const customerId = customerDoc.id;
      const customerData = customerDoc.data();

      const ticketsRef = collection(db, 'dropzones', dropzoneId, 'customers', customerId, 'tickets');
      const ticketsSnapshot = await getDocs(ticketsRef);

      if (ticketsSnapshot.size > 0) {
        foundTickets = true;
        console.log(`\n  ⚠️  Found ${ticketsSnapshot.size} tickets in client ${customerId}`);
        console.log(`      Customer ID: ${customerData.customerId}`);
        console.log(`      Path: dropzones/${dropzoneId}/clients/${customerId}/tickets`);

        ticketsSnapshot.forEach((ticketDoc) => {
          const ticket = ticketDoc.data();
          console.log(`\n      Ticket: ${ticketDoc.id}`);
          console.log(`        Type: ${ticket.ticketType}`);
          console.log(`        Quantity: ${ticket.quantity}`);
          console.log(`        Used: ${ticket.used || false}`);
          console.log(`        Canceled: ${ticket.canceled || false}`);
        });
      }
    }

    console.log('');
  }

  console.log('================================================================================');

  if (foundTickets) {
    console.log('⚠️  WARNING: Tickets collections found!');
    console.log('');
    console.log('These should be migrated to the purchases collection or removed.');
    console.log('The app now uses /dropzones/{dropzoneId}/purchases exclusively.');
  } else {
    console.log('✅ No tickets collections found');
    console.log('');
    console.log('The app is using the correct structure:');
    console.log('  /dropzones/{dropzoneId}/purchases');
  }

  console.log('================================================================================');
}

checkForTicketsCollections().catch(console.error);
