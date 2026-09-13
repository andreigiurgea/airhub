import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING SHOP COLLECTIONS');
    console.log('='.repeat(80) + '\n');

    // Check shop_products
    console.log('📦 SHOP_PRODUCTS:\n');
    const shopProductsRef = collection(db, 'shop_products');
    const shopProductsSnap = await getDocs(shopProductsRef);

    console.log(`Found ${shopProductsSnap.size} products\n`);
    shopProductsSnap.forEach((doc) => {
      const data = doc.data();
      console.log(`${data.name || '[No name]'}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Price: ${data.price} ${data.currency || 'AED'}`);
      console.log(`  Category: ${data.category || data.categoryId || '[No category]'}`);
      console.log(`  Description: ${data.description || '[None]'}`);
      console.log(`  Fields:`, Object.keys(data).join(', '));
      console.log('');
    });

    // Check shop_categories
    console.log('\n' + '-'.repeat(80));
    console.log('📁 SHOP_CATEGORIES:\n');
    const shopCategoriesRef = collection(db, 'shop_categories');
    const shopCategoriesSnap = await getDocs(shopCategoriesRef);

    console.log(`Found ${shopCategoriesSnap.size} categories\n`);
    shopCategoriesSnap.forEach((doc) => {
      const data = doc.data();
      console.log(`${data.name || '[No name]'}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Icon: ${data.icon || '[None]'}`);
      console.log(`  Order: ${data.order || '[None]'}`);
      console.log(`  Fields:`, Object.keys(data).join(', '));
      console.log('');
    });

    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
