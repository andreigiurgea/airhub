# Balance Path Fix - Issue Resolved

## Problem
Available balance was not updating after purchases. The balance was showing as applied during checkout, but after the purchase, the balance remained the same (1000 AED).

## Root Cause
The balance service was looking for balance in the **wrong path**:
- **Expected path (code):** `/dropzones/{dropzoneId}/clients/{clientId}/credits/balance` (separate document)
- **Actual path (Firebase):** `/dropzones/{dropzoneId}/clients/{clientId}` with `balance` as a **field**

The balance is stored as a **field** in the client document, not as a separate subcollection document.

## Solution

### Updated `lib/balanceService.ts`

#### Change 1: Import statement
```typescript
// BEFORE
import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// AFTER
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
```

#### Change 2: getUserBalance() function
```typescript
// BEFORE (lines 60-73)
const clientId = clientsSnapshot.docs[0].id;
const balanceDocRef = doc(db, 'dropzones', dropzoneId, 'clients', clientId, 'credits', 'balance');
const balanceDoc = await getDoc(balanceDocRef);

let availableBalance = 0;
let balanceCurrency = currency;

if (balanceDoc.exists()) {
  const data = balanceDoc.data();
  availableBalance = data?.balance || 0;
  balanceCurrency = data?.currency || currency;
}

return {
  balance: availableBalance,
  currency: balanceCurrency,
};

// AFTER (lines 60-69)
const clientDoc = clientsSnapshot.docs[0];
const clientData = clientDoc.data();

const availableBalance = clientData.balance || 0;
const balanceCurrency = clientData.currency || currency;

return {
  balance: availableBalance,
  currency: balanceCurrency,
};
```

#### Change 3: processPurchaseWithBalance() function
```typescript
// BEFORE (lines 117-137)
const clientId = clientsSnapshot.docs[0].id;
const balanceDocRef = doc(db, 'dropzones', dropzoneId, 'clients', clientId, 'credits', 'balance');
const balanceDoc = await getDoc(balanceDocRef);

let currentBalance = 0;
let currency = customerData.currency || 'AED';

if (balanceDoc.exists()) {
  const data = balanceDoc.data();
  currentBalance = data?.balance || 0;
  currency = data?.currency || currency;
}

const amountFromBalance = Math.min(currentBalance, purchaseAmount);
const amountCharged = purchaseAmount - amountFromBalance;
const newBalance = currentBalance - amountFromBalance;

await setDoc(balanceDocRef, {
  balance: newBalance,
  currency,
  updatedAt: serverTimestamp(),
}, { merge: true });

// AFTER (lines 117-133)
const clientDoc = clientsSnapshot.docs[0];
const clientData = clientDoc.data();
const clientId = clientDoc.id;

const currentBalance = clientData.balance || 0;
const currency = clientData.currency || customerData.currency || 'AED';

const amountFromBalance = Math.min(currentBalance, purchaseAmount);
const amountCharged = purchaseAmount - amountFromBalance;
const newBalance = currentBalance - amountFromBalance;

// Update the balance field in the client document
const clientDocRef = doc(db, 'dropzones', dropzoneId, 'clients', clientId);
await updateDoc(clientDocRef, {
  balance: newBalance,
  updatedAt: serverTimestamp(),
});
```

## Firebase Structure

### Client Document Path
```
/dropzones/{dropzoneId}/clients/{clientId}
```

### Client Document Schema
```json
{
  "accountId": "user123",
  "balance": 1000,           ← Balance is a field, not a subcollection!
  "currency": "AED",
  "customerId": "C8668912",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
  "lastCheckIn": Timestamp,
  "stats": { ... }
}
```

## Test Results

### Before Fix
```
Initial balance: 1000 AED
Purchase: 500 AED
After purchase: 1000 AED ❌ (balance not updated)
```

### After Fix
```
Initial balance: 1000 AED
Purchase: 500 AED
After purchase: 500 AED ✅ (balance correctly updated)
```

## Complete Test Results

```bash
npx tsx scripts/test-complete-cart-purchase.ts
```

**Results:**
- ✅ Balance fetched correctly: 1000 AED
- ✅ Balance applied to purchase: 500 AED
- ✅ Balance deducted from Firebase: 1000 → 500 AED
- ✅ Purchase document created correctly
- ✅ Updated balance verified: 500 AED
- ✅ Balance restored: 500 → 1000 AED

## How It Works Now

### User Flow
1. **User opens cart**
   - `getUserBalance()` reads `balance` field from client document
   - Shows available balance in cart UI

2. **User completes checkout**
   - Cart calculates: `balanceApplied = min(balance, totalAmount)`
   - Calls `processPurchaseWithBalance()`
   - Balance field is updated in client document using `updateDoc()`

3. **After purchase**
   - User returns to cart
   - `getUserBalance()` reads updated balance
   - Shows new reduced balance

### Code Flow
```
Cart opens
    ↓
getUserBalance(userId)
    ↓
Read /dropzones/{id}/clients/{id} document
    ↓
Return clientData.balance
    ↓
Display in cart UI
    ↓
User clicks checkout
    ↓
processPurchaseWithBalance(userId, amount)
    ↓
Calculate: newBalance = currentBalance - amount
    ↓
updateDoc(/dropzones/{id}/clients/{id}, { balance: newBalance })
    ↓
Balance updated in Firebase
    ↓
User returns to cart
    ↓
getUserBalance() returns new balance
```

## Verification

To verify the fix is working:

1. **Check current balance:**
   ```bash
   npx tsx scripts/check-client-balance-field.ts
   ```

2. **Test balance update:**
   ```bash
   npx tsx scripts/test-balance-update.ts
   ```

3. **Test complete purchase flow:**
   ```bash
   npx tsx scripts/test-complete-cart-purchase.ts
   ```

## Summary

✅ **FIXED:** Balance is now correctly read from the client document's `balance` field
✅ **FIXED:** Balance is now correctly updated using `updateDoc()` on the client document
✅ **FIXED:** Balance updates are reflected immediately in the app
✅ **FIXED:** Users can see their balance decrease after purchases
✅ **WORKING:** Complete purchase flow with balance application

**The balance system is now fully functional!**
