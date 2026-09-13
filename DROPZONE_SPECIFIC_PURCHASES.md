# Dropzone-Specific Purchases Implementation

## Overview

The purchase system has been updated to store all purchases in dropzone-specific subcollections instead of a global `purchases` collection. This ensures better data organization and enables dropzone-specific features.

## Database Structure

### Before (Incorrect)
```
/purchases
  /{purchaseId}
    - customerId
    - items[]
    - totalAmount
    ...
```

### After (Correct)
```
/dropzones
  /{dropzoneId}
    /purchases
      /{purchaseId}
        - customerId
        - dropzoneId
        - dropzoneName
        - items[]
        - totalAmount
        ...
```

## Changes Made

### 1. Cart Checkout (app/cart.tsx)

**Changed:**
- Purchase creation now writes to `dropzones/{dropzoneId}/purchases` instead of global `purchases` collection

**Code Change:**
```typescript
// OLD
const purchasesRef = collection(db, 'purchases');

// NEW
const purchasesRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'purchases');
```

### 2. Shop Tickets Display (app/shop.tsx)

**Changed:**
- Tickets are now loaded from all dropzone-specific purchase subcollections
- Real-time listeners are set up for each dropzone
- Tickets are consolidated across all dropzones

**Implementation:**
- Fetches all dropzones
- Sets up a real-time listener for each dropzone's purchases
- Consolidates tickets from all dropzones
- Updates UI when purchases are made at any dropzone

**Benefits:**
- Tickets from all dropzones are visible
- Real-time updates work correctly
- Proper separation of data by dropzone

## How It Works

### Purchase Flow

1. **User adds items to cart** (shop.tsx)
   - Products are loaded from current dropzone's `shop_products` subcollection
   - Items are stored in local cart

2. **User checks out** (cart.tsx)
   - Purchase is created in `dropzones/{dropzoneId}/purchases`
   - Balance is deducted (if applicable)
   - Purchase includes all necessary fields:
     - customerId
     - accountId
     - dropzoneId
     - dropzoneName
     - items[]
     - totalAmount
     - paymentMethod
     - status
     - purchasedAt

3. **Tickets appear in My Tickets** (shop.tsx)
   - Real-time listeners detect the new purchase
   - Tickets are extracted from purchase items
   - Consolidated view shows all tickets grouped by type

### Real-Time Updates

The shop screen sets up multiple real-time listeners:

```typescript
// For each dropzone
const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
const purchasesQuery = query(purchasesRef, where('customerId', '==', customerId));
onSnapshot(purchasesQuery, (snapshot) => {
  // Process purchases and update tickets
});
```

When a purchase is made:
1. The listener for that dropzone fires immediately
2. New tickets are extracted from the purchase
3. The tickets map is updated
4. The UI re-renders with new tickets

### Balance Updates

Balance is stored globally and works independently:
- Location: `/credits` collection
- Tracks: Customer balance across all dropzones
- Updates: Real-time when purchases use balance

## Testing

### Verify Purchase Creation

```bash
npx tsx scripts/test-purchase-to-dropzone.ts
```

This test:
- Creates a test purchase in a dropzone's purchases subcollection
- Verifies the purchase is stored correctly
- Confirms all fields are present

### Verify Complete Flow

```bash
npx tsx scripts/test-complete-shop-flow.ts
```

This test:
- Checks customer info
- Verifies check-in status
- Lists available products
- Shows current balance
- Lists all purchases across all dropzones
- Calculates total tickets

### Verify Database Structure

```bash
npx tsx scripts/check-firebase-structure.ts
```

This test:
- Shows global purchases collection (should be empty)
- Lists all dropzones with their subcollections
- Counts purchases per dropzone
- Verifies the correct structure

## Migration Notes

### Existing Data

- Old purchases in the global `purchases` collection are not automatically migrated
- The app will only show new purchases created after this change
- To migrate old data, run a migration script (not included)

### Backwards Compatibility

- The system is NOT backwards compatible with the old structure
- All new purchases MUST be created in dropzone subcollections
- The shop screen will NOT show purchases from the global collection

## Benefits of This Approach

1. **Better Data Organization**
   - Each dropzone's purchases are isolated
   - Easier to query dropzone-specific data
   - Simpler to implement dropzone-specific features

2. **Scalability**
   - Can handle many dropzones without performance issues
   - Queries are scoped to specific dropzones
   - Better Firebase read optimization

3. **Security**
   - Can set dropzone-specific security rules
   - Easier to control access per dropzone
   - Better data isolation

4. **Future Features**
   - Dropzone-specific analytics
   - Dropzone-specific reporting
   - Multi-dropzone management

## Troubleshooting

### Tickets Not Showing After Purchase

**Possible Causes:**
- Purchase was created in wrong location (global collection)
- Real-time listener not set up correctly
- User not checked in to a dropzone

**Solutions:**
1. Verify purchase location using `check-firebase-structure.ts`
2. Check browser console for listener errors
3. Ensure user is checked in before making purchase

### Balance Not Updating

**Note:** Balance is global and unaffected by this change

**Possible Causes:**
- Credits collection not updated
- Real-time listener not connected

**Solutions:**
1. Check credits collection directly
2. Verify balance listener in shop.tsx
3. Check network connectivity

### Purchases Missing from Old System

**Expected Behavior:** Old purchases in global collection won't show

**Solutions:**
1. Run migration script to move old purchases
2. Accept data loss for test purchases
3. Document cutover date for users

## Related Files

- `app/cart.tsx` - Purchase creation
- `app/shop.tsx` - Purchase display and tickets
- `lib/balanceService.ts` - Balance management (unchanged)
- `lib/dropzoneService.ts` - Check-in management (unchanged)

## Future Enhancements

1. **Migration Tool**
   - Script to migrate old purchases to dropzone subcollections
   - Preserve all data and timestamps

2. **Dropzone Analytics**
   - Revenue per dropzone
   - Popular products per dropzone
   - Purchase trends

3. **Multi-Dropzone Cart**
   - Allow items from multiple dropzones in one cart
   - Split payment across dropzones

4. **Dropzone-Specific Pricing**
   - Different prices per dropzone
   - Dropzone-specific discounts
   - Regional pricing support
