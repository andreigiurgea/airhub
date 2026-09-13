import { db } from './firebase';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getDropzoneById } from './dropzoneService';
import { logger } from './logger';
import { getCustomerData } from './customerCache';

export interface BalanceData {
  balance: number;
  currency: string;
}

export interface PurchaseResult {
  amountFromBalance: number;
  amountCharged: number;
  newBalance: number;
}

export async function getUserBalance(accountId: string): Promise<BalanceData | null> {
  try {
    const customerResult = await getCustomerData(accountId);

    if (!customerResult) {
      logger.log('No customer found for accountId:', accountId);
      return null;
    }

    const customerId = customerResult.customerId;
    const customerData = customerResult.data;

    if (!customerData.currentDropzone || !customerData.currentDropzone.dropzoneId) {
      logger.log('User not checked in to any dropzone');
      return {
        balance: 0,
        currency: 'AED',
      };
    }

    const dropzoneId = customerData.currentDropzone.dropzoneId;

    // Get dropzone currency
    const dropzone = await getDropzoneById(dropzoneId);
    const currency = dropzone?.currency || 'AED';

    const dropzoneCustomersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const dropzoneCustomersQuery = query(dropzoneCustomersRef, where('customerId', '==', customerId));
    const dropzoneCustomersSnapshot = await getDocs(dropzoneCustomersQuery);

    if (dropzoneCustomersSnapshot.empty) {
      logger.log('No customer record found for this dropzone');
      return {
        balance: 0,
        currency,
      };
    }

    const dropzoneCustomerDoc = dropzoneCustomersSnapshot.docs[0];
    const dropzoneCustomerData = dropzoneCustomerDoc.data();

    const availableBalance = dropzoneCustomerData.balance || 0;

    return {
      balance: availableBalance,
      currency: currency,
    };
  } catch (error) {
    logger.error('Error fetching user balance:', error);
    return null;
  }
}

export async function processPurchaseWithBalance(
  accountId: string,
  purchaseAmount: number
): Promise<PurchaseResult | null> {
  try {
    const customerResult = await getCustomerData(accountId);

    if (!customerResult) {
      logger.log('No customer found for accountId:', accountId);
      return null;
    }

    const customerId = customerResult.customerId;
    const customerData = customerResult.data;

    if (!customerData.currentDropzone || !customerData.currentDropzone.dropzoneId) {
      logger.log('User not checked in to any dropzone');
      return null;
    }

    const dropzoneId = customerData.currentDropzone.dropzoneId;

    const dropzoneCustomersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const dropzoneCustomersQuery = query(dropzoneCustomersRef, where('customerId', '==', customerId));
    const dropzoneCustomersSnapshot = await getDocs(dropzoneCustomersQuery);

    if (dropzoneCustomersSnapshot.empty) {
      logger.log('No customer record found for this dropzone');
      return null;
    }

    const dropzoneCustomerDoc = dropzoneCustomersSnapshot.docs[0];
    const dropzoneCustomerData = dropzoneCustomerDoc.data();
    const dropzoneCustomerId = dropzoneCustomerDoc.id;

    // Get dropzone currency
    const dropzone = await getDropzoneById(dropzoneId);
    const currency = dropzone?.currency || 'AED';

    const currentBalance = dropzoneCustomerData.balance || 0;

    const amountFromBalance = Math.min(currentBalance, purchaseAmount);
    const amountCharged = purchaseAmount - amountFromBalance;
    const newBalance = currentBalance - amountFromBalance;

    // Update the balance field in the dropzone customer document
    const dropzoneCustomerDocRef = doc(db, 'dropzones', dropzoneId, 'customers', dropzoneCustomerId);
    await updateDoc(dropzoneCustomerDocRef, {
      balance: newBalance,
      updatedAt: serverTimestamp(),
    });

    logger.log(`Balance updated: ${currentBalance} -> ${newBalance} (Used: ${amountFromBalance})`);

    return {
      amountFromBalance,
      amountCharged,
      newBalance,
    };
  } catch (error) {
    logger.error('Error processing purchase with balance:', error);
    return null;
  }
}
