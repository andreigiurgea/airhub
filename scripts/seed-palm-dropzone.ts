import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const PALM_DROPZONE_ID = 'yfjBsZLLIcOJYGYBnnEi';

const categories = [
  { name: 'Jump Tickets', icon: 'plane' },
  { name: 'Training Camps', icon: 'award' },
  { name: 'Gear Rentals', icon: 'package' },
  { name: 'Video & Photo', icon: 'camera' },
];

const products = [
  // Jump Tickets
  {
    name: 'Solo Jump',
    description: 'Standard solo jump from 13,000ft',
    price: 250,
    currency: 'AED',
    category: 'Jump Tickets',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/866398/pexels-photo-866398.jpeg',
  },
  {
    name: 'Tandem Jump',
    description: 'Tandem skydive with certified instructor',
    price: 1499,
    currency: 'AED',
    category: 'Jump Tickets',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/1262304/pexels-photo-1262304.jpeg',
  },
  {
    name: 'Coach Jump',
    description: 'Jump with personal coach',
    price: 450,
    currency: 'AED',
    category: 'Jump Tickets',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/848618/pexels-photo-848618.jpeg',
  },

  // Training Camps
  {
    name: 'Belly Flying Camp',
    description: '3-day belly flying intensive training',
    price: 2500,
    currency: 'AED',
    category: 'Training Camps',
    stock: 10,
    active: true,
    image: 'https://images.pexels.com/photos/1557652/pexels-photo-1557652.jpeg',
  },
  {
    name: 'Freefly Camp',
    description: '3-day freefly progression camp',
    price: 2800,
    currency: 'AED',
    category: 'Training Camps',
    stock: 8,
    active: true,
    image: 'https://images.pexels.com/photos/2526935/pexels-photo-2526935.jpeg',
  },
  {
    name: 'Wingsuit Introduction',
    description: '2-day wingsuit first flight course',
    price: 3200,
    currency: 'AED',
    category: 'Training Camps',
    stock: 5,
    active: true,
    image: 'https://images.pexels.com/photos/848612/pexels-photo-848612.jpeg',
  },

  // Gear Rentals
  {
    name: 'Complete Rig Rental',
    description: 'Main + Reserve + AAD',
    price: 150,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 20,
    active: true,
    image: 'https://images.pexels.com/photos/1274611/pexels-photo-1274611.jpeg',
  },
  {
    name: 'Jumpsuit Rental',
    description: 'Professional jumpsuit rental',
    price: 35,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 30,
    active: true,
    image: 'https://images.pexels.com/photos/2526935/pexels-photo-2526935.jpeg',
  },
  {
    name: 'Helmet Rental',
    description: 'Camera-ready helmet',
    price: 25,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 25,
    active: true,
    image: 'https://images.pexels.com/photos/163431/crash-test-collision-60-km-h-distraction-163431.jpeg',
  },
  {
    name: 'Goggles Rental',
    description: 'Clear vision goggles',
    price: 15,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 40,
    active: true,
    image: 'https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg',
  },
  {
    name: 'Altimeter Rental',
    description: 'Digital altimeter',
    price: 20,
    currency: 'AED',
    category: 'Gear Rentals',
    stock: 15,
    active: true,
    image: 'https://images.pexels.com/photos/280232/pexels-photo-280232.jpeg',
  },

  // Video & Photo
  {
    name: 'Video Package',
    description: 'Professional video of your jump',
    price: 350,
    currency: 'AED',
    category: 'Video & Photo',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg',
  },
  {
    name: 'Photo Package',
    description: 'Professional photos of your jump',
    price: 250,
    currency: 'AED',
    category: 'Video & Photo',
    stock: null,
    active: true,
    image: 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg',
  },
  {
    name: 'Video + Photo Combo',
    description: 'Complete media package',
    price: 550,
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
    console.log('SEEDING SKYDIVE DUBAI PALM DROPZONE PRODUCTS');
    console.log('='.repeat(80) + '\n');

    const productsRef = collection(db, 'dropzones', PALM_DROPZONE_ID, 'shop_products');

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
