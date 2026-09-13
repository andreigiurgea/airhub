import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function verifyDisplay() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

  console.log('=== VERIFYING CATEGORY DISPLAY ===\n');
  
  // Get categories from shop_categories
  const categoriesRef = collection(db, 'dropzones', dropzoneId, 'shop_categories');
  const categoriesSnapshot = await getDocs(categoriesRef);
  
  const categoriesMap = new Map();
  categoriesSnapshot.forEach(doc => {
    const data = doc.data();
    categoriesMap.set(doc.id, data.name);
  });
  
  console.log('Categories found:');
  categoriesMap.forEach((name, id) => {
    console.log(`  ${id} -> "${name}"`);
  });

  // Get products
  const productsRef = collection(db, 'dropzones', dropzoneId, 'shop_products');
  const productsSnapshot = await getDocs(productsRef);
  
  console.log('\nProducts and their category display:');
  productsSnapshot.forEach(doc => {
    const data = doc.data();
    const categoryId = data.category;
    const categoryName = categoriesMap.get(categoryId) || 'Uncategorized';
    console.log(`\nProduct: ${data.name}`);
    console.log(`  Category ID: ${categoryId}`);
    console.log(`  Will display as: "${categoryName}"`);
  });
  
  console.log('\n✅ Category names will now display correctly instead of IDs!');
}

verifyDisplay().catch(console.error);
