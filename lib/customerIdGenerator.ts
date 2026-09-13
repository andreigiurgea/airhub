import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function generateNextClientId(): Promise<string> {
  try {
    const customersSnapshot = await getDocs(collection(db, 'customers'));

    let highestIdNumber = 0;

    customersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.customerId && typeof data.customerId === 'string') {
        const match = data.customerId.match(/^C(\d{4})$/);
        if (match) {
          const idNumber = parseInt(match[1], 10);
          if (idNumber > highestIdNumber) {
            highestIdNumber = idNumber;
          }
        }
      }
    });

    const nextIdNumber = highestIdNumber + 1;
    const customerId = `C${String(nextIdNumber).padStart(4, '0')}`;

    return customerId;
  } catch (error) {
    console.error('Error generating customer ID:', error);
    throw new Error('Failed to generate customer ID');
  }
}
