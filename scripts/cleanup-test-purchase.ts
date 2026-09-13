import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

async function cleanupPurchase() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const purchaseId = 'sNIjNiHVR9mayQqnIIji';

  console.log('Marking purchase as used...');
  console.log('Path: /dropzones/' + dropzoneId + '/purchases/' + purchaseId);

  const purchaseRef = doc(db, 'dropzones', dropzoneId, 'purchases', purchaseId);
  
  await updateDoc(purchaseRef, {
    'items.0.used': true
  });

  console.log('✅ Purchase item marked as used');
}

cleanupPurchase().catch(console.error);
