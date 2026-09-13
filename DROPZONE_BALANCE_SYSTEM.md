# Dropzone-Specific Balance System

## Overview

The balance system has been updated to store customer balances in dropzone-specific client records instead of a global credits collection. This ensures proper isolation of balance data per dropzone.

## Database Structure

### Before (Incorrect)
```
/credits
  /{creditId}
    - customerId
    - balance
    - updatedAt
```

### After (Correct)
```
/dropzones
  /{dropzoneId}
    /clients
      /{clientId}
        - customerId
        - accountId
        - email
        - firstName
        - lastName
        - phone
        - createdAt
        - updatedAt
        /credits
          /balance
            - balance
            - currency
            - updatedAt
```

## Key Changes

### 1. Balance Service (lib/balanceService.ts)

Both `getUserBalance()` and `processPurchaseWithBalance()` have been updated to:

1. **Check if user is checked in** - Balance only available when checked into a dropzone
2. **Find or create client record** - Automatically creates client in dropzone if needed
3. **Read/write from correct location** - Uses `/dropzones/{dropzoneId}/clients/{clientId}/credits/balance`

### 2. Shop Screen (app/shop.tsx)

The balance listener has been updated to:

1. **Require check-in** - Only sets up listener when `currentCheckIn` is available
2. **Listen to dropzone-specific balance** - Watches the balance document for the current dropzone
3. **Auto-create client record** - Creates client record when setting up listener if needed

## How It Works

### Balance Retrieval Flow

1. User must be checked into a dropzone
2. System finds or creates a client record in that dropzone's `clients` collection
3. Balance is read from `/dropzones/{dropzoneId}/clients/{clientId}/credits/balance`
4. If no balance document exists, defaults to 0

### Purchase Flow with Balance

1. User adds items to cart and initiates checkout
2. `processPurchaseWithBalance()` is called with purchase amount
3. System:
   - Verifies user is checked in
   - Finds or creates client record
   - Reads current balance
   - Calculates amount to use from balance
   - Updates balance document
   - Returns breakdown of payment

### Real-Time Updates

The shop screen maintains a real-time listener on the balance document:

```typescript
const balanceDocRef = doc(
  db,
  'dropzones',
  dropzoneId,
  'clients',
  clientId,
  'credits',
  'balance'
);

onSnapshot(balanceDocRef, (doc) => {
  if (doc.exists()) {
    const balanceData = doc.data();
    setBalance(balanceData.balance);
    setCurrency(balanceData.currency);
  }
});
```

When a purchase is made:
1. Balance document is updated
2. Listener fires immediately
3. UI updates with new balance

## Client Record Creation

Client records are automatically created when:
- User's balance is first accessed
- User makes a purchase
- Balance listener is set up

Client record includes:
- `customerId` - Links to customer in global `customers` collection
- `accountId` - Firebase Auth user ID
- `email`, `firstName`, `lastName`, `phone` - Basic profile info
- `createdAt`, `updatedAt` - Timestamps

## Benefits

### 1. Dropzone Isolation
- Each dropzone maintains its own client records
- Balances are isolated per dropzone
- Different dropzones can have independent pricing/credit systems

### 2. Scalability
- No need to query global collections
- Efficient per-dropzone queries
- Better Firebase performance

### 3. Multi-Dropzone Support
- Users can have different balances at different dropzones
- Clear separation of financial data
- Easier to implement dropzone-specific features

### 4. Security
- Can set dropzone-specific security rules
- Better access control
- Data isolation by dropzone

## Testing

### Test Balance Creation

```bash
npx tsx scripts/test-new-balance-system.ts
```

This test:
- Finds a checked-in customer
- Creates or finds client record
- Sets a test balance of 250 AED
- Verifies the balance is stored correctly

### Test Purchase with Balance

```bash
npx tsx scripts/test-purchase-with-balance.ts
```

This test:
- Checks initial balance
- Processes a test purchase
- Verifies balance is deducted correctly
- Confirms new balance is accurate

### Scan Client Records

```bash
npx tsx scripts/scan-all-dropzone-clients.ts
```

This test:
- Lists all dropzones
- Shows client records in each dropzone
- Displays balance documents

## Important Requirements

### User Must Be Checked In

Balance operations **require** the user to be checked into a dropzone:

```typescript
if (!customerData.currentDropzone || !customerData.currentDropzone.dropzoneId) {
  // Return null or default balance
  return { balance: 0, currency: 'AED' };
}
```

Without an active check-in:
- Balance shows as 0
- Purchases cannot use balance
- Balance listener doesn't start

### Automatic Client Creation

The system automatically creates client records as needed. No manual creation required.

### Balance Document Structure

The balance is stored in a specific document at path `credits/balance`:

```typescript
{
  balance: number,        // Current balance amount
  currency: string,       // Currency code (e.g., 'AED')
  updatedAt: timestamp    // Last update time
}
```

## Migration from Old System

### Old System (No Longer Used)
- Global `/credits` collection
- Credits linked by `customerId`
- Balance tracked across multiple credit documents

### New System (Current)
- Dropzone-specific `/dropzones/{dropzoneId}/clients/{clientId}/credits/balance`
- Single balance document per client per dropzone
- Automatic creation when needed

### Migration Notes

- No automatic migration implemented
- Old credits data is not read by new system
- Users will start with 0 balance in new system
- Can manually set balances using Firebase Console or scripts

## Common Operations

### Set a User's Balance

```typescript
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

await setDoc(
  doc(db, 'dropzones', dropzoneId, 'clients', clientId, 'credits', 'balance'),
  {
    balance: 500,
    currency: 'AED',
    updatedAt: serverTimestamp()
  },
  { merge: true }
);
```

### Add to Balance

```typescript
const balanceDoc = await getDoc(balanceDocRef);
const currentBalance = balanceDoc.exists() ? balanceDoc.data().balance : 0;

await setDoc(balanceDocRef, {
  balance: currentBalance + amountToAdd,
  currency: 'AED',
  updatedAt: serverTimestamp()
}, { merge: true });
```

### Get Balance for Display

```typescript
import { getUserBalance } from '@/lib/balanceService';

const balanceData = await getUserBalance(accountId);
if (balanceData) {
  console.log(`Balance: ${balanceData.balance} ${balanceData.currency}`);
}
```

## Troubleshooting

### Balance Shows as 0

**Possible Causes:**
- User not checked in to a dropzone
- No balance document created yet
- Client record not created

**Solutions:**
1. Ensure user is checked in: Check `customer.currentDropzone`
2. Run test script to create balance: `npx tsx scripts/test-new-balance-system.ts`
3. Manually create balance in Firebase Console

### Balance Not Updating in Real-Time

**Possible Causes:**
- Balance listener not set up (no check-in)
- Network connectivity issues
- Client record doesn't exist

**Solutions:**
1. Check browser console for listener errors
2. Verify check-in status
3. Check network connection
4. Run scan script to verify client exists

### Purchase Fails with Balance

**Possible Causes:**
- User not checked in
- Client record not found
- Balance document doesn't exist

**Solutions:**
1. Verify check-in status
2. Check console logs for specific error
3. Run balance test script to verify setup

### Different Balance per Dropzone

**Expected Behavior:** This is intentional

Each dropzone maintains separate balances for each user. When a user switches dropzones:
- Old dropzone balance is preserved
- New dropzone shows its own balance
- No balance transfer between dropzones

## Future Enhancements

1. **Balance Transfer**
   - Allow users to transfer balance between dropzones
   - Audit trail for transfers

2. **Balance History**
   - Track all balance changes
   - Show transaction history
   - Export statements

3. **Multi-Currency Support**
   - Different currencies per dropzone
   - Automatic conversion rates

4. **Credit Expiration**
   - Set expiration dates on balances
   - Automatic expiration handling

5. **Balance Packages**
   - Pre-defined credit packages
   - Bulk purchase discounts

## Related Files

- `lib/balanceService.ts` - Core balance operations
- `app/shop.tsx` - Balance display and real-time updates
- `app/cart.tsx` - Purchase processing with balance
- `lib/dropzoneService.ts` - Check-in management (required for balance)

## Security Considerations

### Firebase Security Rules

Ensure proper security rules for the new structure:

```javascript
match /dropzones/{dropzoneId}/clients/{clientId} {
  // Allow read if user is the client or staff
  allow read: if request.auth != null &&
    (resource.data.accountId == request.auth.uid || isStaff(dropzoneId));

  // Only staff can write client records
  allow write: if request.auth != null && isStaff(dropzoneId);

  match /credits/balance {
    // Same rules as parent
    allow read: if request.auth != null &&
      (get(/databases/$(database)/documents/dropzones/$(dropzoneId)/clients/$(clientId)).data.accountId == request.auth.uid ||
       isStaff(dropzoneId));
    allow write: if request.auth != null && isStaff(dropzoneId);
  }
}
```

### Data Privacy

- Balance data is only accessible to the user and dropzone staff
- Balance is not visible across dropzones without proper access
- Client records contain minimal personal information
