import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';

const storeProducts = [
  {
    name: 'Tracking',
    type: 'ticket',
    category: 'Tickets',
    price: 458.75,
    currency: 'AED',
    validityPeriod: 12,
    validityUnit: 'months',
    date: '15/06/2024',
    description: 'Available for 12 months',
    icon: 'tracking',
  },
  {
    name: 'Belly Flying',
    type: 'ticket',
    category: 'Tickets',
    price: 350.00,
    currency: 'AED',
    validityPeriod: 12,
    validityUnit: 'months',
    date: '15/06/2024',
    description: 'Available for 12 months',
    icon: 'parachute',
  },
  {
    name: 'Freefly',
    type: 'ticket',
    category: 'Tickets',
    price: 425.00,
    currency: 'AED',
    validityPeriod: 12,
    validityUnit: 'months',
    date: '15/06/2024',
    description: 'Available for 12 months',
    icon: 'wind',
  },
  {
    name: 'Summer Camp 2024',
    type: 'camp',
    category: 'Camp Tickets',
    price: 1200.00,
    currency: 'AED',
    startDate: '09/06/2024',
    endDate: '15/06/2024',
    description: '7-day intensive training camp',
    icon: 'tent',
  },
  {
    name: 'Advanced Training Camp',
    type: 'camp',
    category: 'Camp Tickets',
    price: 1500.00,
    currency: 'AED',
    startDate: '20/07/2024',
    endDate: '27/07/2024',
    description: '8-day advanced skills camp',
    icon: 'mountain',
  },
];

(async () => {
  console.log('Seeding store products...');

  const productsRef = collection(db, 'products');

  // Check if products already exist
  const existingProducts = await getDocs(query(productsRef));
  if (existingProducts.size > 0) {
    console.log(`Products already exist (${existingProducts.size} documents). Skipping seed.`);
    process.exit(0);
  }

  for (const product of storeProducts) {
    try {
      const docRef = await addDoc(productsRef, {
        ...product,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Added product: ${product.name} (${docRef.id})`);
    } catch (error) {
      console.error(`Error adding product ${product.name}:`, error);
    }
  }

  console.log('Store seeding complete!');
  process.exit(0);
})();
