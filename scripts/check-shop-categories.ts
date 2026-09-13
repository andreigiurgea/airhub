import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkShopCategories() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const categoryId = '6fksMgZA20cuvw5YuGEt';

  console.log('=== CHECKING SHOP_CATEGORIES ===\n');
  
  const categoryRef = doc(db, 'dropzones', dropzoneId, 'shop_categories', categoryId);
  const categoryDoc = await getDoc(categoryRef);
  
  if (categoryDoc.exists()) {
    console.log('✅ Category found!');
    console.log('Category ID:', categoryDoc.id);
    console.log('Category data:', categoryDoc.data());
  } else {
    console.log('❌ Category not found');
  }
}

checkShopCategories().catch(console.error);
