# Purchase System Update

## Overview
The purchase system has been updated to use a single source of truth for all purchases and tickets. The separate tickets collection has been removed.

## Previous Structure (REMOVED)
```
/dropzones/{dropzoneId}/
  ├── clients/{clientId}/
  │   └── tickets/{ticketId}  ❌ REMOVED
  └── purchases/{purchaseId}
```

## Current Structure (ACTIVE)
```
/dropzones/{dropzoneId}/
  └── purchases/{purchaseId}
      ├── customerId
      ├── accountId
      ├── dropzoneId
      ├── dropzoneName
      ├── currency
      ├── altitude
      ├── totalAmount
      ├── paymentMethod
      ├── purchasedAt
      ├── status
      ├── canceled (boolean)
      └── items[] (array)
          ├── name
          ├── quantity
          ├── price
          ├── productId
          ├── category
          ├── used (boolean)
          └── canceled (boolean)
```

## Changes Made

### 1. cart.tsx (app/cart.tsx)
**Removed:**
- Client lookup logic (lines 200-210)
- Tickets collection creation (lines 244-261)

**Added:**
- `used: false` and `canceled: false` fields to each item in the purchase
- `canceled: false` field to the purchase document

**Result:**
- Checkout now only creates a purchase document
- All ticket information is stored in the `items` array within the purchase
- No separate tickets collection is created

### 2. shop.tsx (app/shop.tsx)
**No changes required:**
- Already reads from `/dropzones/{dropzoneId}/purchases`
- Correctly filters items based on `used` and `canceled` flags
- Displays items from the `items` array in each purchase

## Data Flow

### Purchase Flow (cart.tsx)
1. User adds items to cart
2. User checks out
3. System creates a single purchase document at:
   `/dropzones/{dropzoneId}/purchases/{purchaseId}`
4. Purchase contains all items with `used: false` and `canceled: false`

### Display Flow (shop.tsx)
1. System queries all purchases where `customerId` matches the current user
2. Filters out purchases where `canceled: true`
3. For each purchase, iterates through `items` array
4. Filters out items where `used: true` or `canceled: true`
5. Displays remaining items as available tickets

## Benefits

1. **Single Source of Truth**: All purchase and ticket data is in one place
2. **Simplified Data Structure**: No need to maintain multiple collections
3. **Consistent Data**: Items are always associated with their parent purchase
4. **Real-time Updates**: shop.tsx listeners automatically reflect changes
5. **Easier Queries**: No need to query multiple subcollections

## Testing

Test script: `scripts/test-updated-purchase-flow.ts`

Verifies:
- ✅ Purchases are stored in correct location
- ✅ Items have required `used` and `canceled` fields
- ✅ shop.tsx correctly displays items
- ✅ No tickets collection is created

## Migration Notes

No migration is needed as:
- Old tickets collections are not created anymore
- shop.tsx already reads from purchases collection
- Existing purchases are compatible with the new structure (shop.tsx handles missing fields with defaults)
