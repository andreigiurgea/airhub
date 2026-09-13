import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const DESERT_DROPZONE_ID = 'ukxVHHJn9VwN0T7crcRd';

const products = [
  // Jump Tickets
  {
    name: 'Solo Jump',
    description: 'Standard solo jump from 13,000ft over the desert',
    price: 275,
    currency: 'AED',
    category: 'Jump Tickets',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/866398/pexels-photo-866398.jpeg',
  },
  {
    name: 'Tandem Jump',
    description: 'Tandem skydive with certified instructor',
    price: 1599,
    currency: 'AED',
    category: 'Jump Tickets',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/1262304/pexels-photo-1262304.jpeg',
  },
  {
    name: 'Sunset Jump',
    description: 'Experience the desert sunset from above',
    price: 350,
    currency: 'AED',
    category: 'Jump Tickets',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/848618/pexels-photo-848618.jpeg',
  },
  {
    name: 'Coach Jump',
    description: 'Jump with personal coach',
    price: 475,
    currency: 'AED',
    category: 'Jump Tickets',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/848618/pexels-photo-848618.jpeg',
  },

  // Training Camps
  {
    name: 'Desert Formation Camp',
    description: '4-day formation skydiving in the desert',
    price: 2700,
    currency: 'AED',
    category: 'Training Camps',
    stock: 12,
    active: true,
    image: 'https://images.pexels.com/photos/1557652/pexels-photo-1557652.jpeg',
  },
  {
    name: 'Advanced Freefly',
    description: '3-day advanced freefly techniques',
    price: 2900,
    currency: 'AED',
    category: 'Training Camps',
    stock: 10,
    active: true,
    image: 'https://images.pexels.com/photos/2526935/pexels-photo-2526935.jpeg',
  },

  // Gear Rentals
  {
    name: 'Complete Rig Rental',
    description: 'Main + Reserve + AAD',
    price: 175,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 15,
    active: true,
    image: 'https://images.pexels.com/photos/1274611/pexels-photo-1274611.jpeg',
  },
  {
    name: 'Jumpsuit Rental',
    description: 'Professional jumpsuit rental',
    price: 40,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 25,
    active: true,
    image: 'https://images.pexels.com/photos/2526935/pexels-photo-2526935.jpeg',
  },
  {
    name: 'Helmet Rental',
    description: 'Camera-ready helmet',
    price: 30,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 20,
    active: true,
    image: 'https://images.pexels.com/photos/163431/crash-test-collision-60-km-h-distraction-163431.jpeg',
  },
  {
    name: 'Goggles Rental',
    description: 'Clear vision goggles',
    price: 20,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 35,
    active: true,
    image: 'https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg',
  },

  // Video & Photo
  {
    name: 'Video Package',
    description: 'Professional video of your desert jump',
    price: 375,
    currency: 'AED',
    category: 'Video & Photo',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg',
  },
  {
    name: 'Photo Package',
    description: 'Professional photos of your desert jump',
    price: 275,
    currency: 'AED',
    category: 'Video & Photo',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg',
  },
  {
    name: 'Complete Media Package',
    description: 'Video + Photo + Edited highlights',
    price: 600,
    currency: 'AED',
    category: 'Video & Photo',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/821738/pexels-photo-821738.jpeg',
  },
];

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('SEEDING SKYDIVE DUBAI DESERT DROPZONE PRODUCTS');
    console.log('='.repeat(80) + '\n');

    const productsRef = collection(db, 'dropzones', DESERT_DROPZONE_ID, 'shop_products');

    console.log('Adding products...\n');

    for (const product of products) {
      console.log(`Adding: ${product.name} (${product.category}) - ${product.price} ${product.currency}`);

      await addDoc(productsRef, {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✓ Successfully added ${products.length} products`);
    console.log('='.repeat(80) + '\n');

    // Show summary by category
    const summary: { [key: string]: number } = {};
    products.forEach((product) => {
      summary[product.category] = (summary[product.category] || 0) + 1;
    });

    console.log('Products by category:');
    Object.keys(summary).forEach((category) => {
      console.log(`  ${category}: ${summary[category]} products`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
