# Mobile Purchase Implementation

## Overview

Mobile purchases from the app are now stored in the same Firebase `purchases` collection as web/POS purchases, with real-time updates working seamlessly.

## Key Changes

### 1. Purchase Schema Enhancement

Mobile purchases now include the `mobilePurchase: true` field to distinguish them from web/POS purchases.

**Location:** `app/cart.tsx` (lines 200-234)

**Complete Schema:**

```typescript
{
  // Identification
  customerId: string,
  accountId: string,
  userId: string,
  dropzoneId: string,
  dropzoneName: string,

  // Items
  items: [
    {
      name: string,
      quantity: number,
      price: number,
      productId: string,
      category: string,
      used: boolean,
      canceled: boolean,
    }
  ],

  // Pricing
  totalAmount: number,
  subtotal: number,
  total: number,
  amountFromBalance: number,
  amountCharged: number,
  creditUsed: number,

  // Payment
  paymentMethod: string,
  currency: string,

  // Status
  status: string,
  canceled: boolean,
  validated: boolean,

  // Metadata
  altitude: number,
  refNumber: string,
  mobilePurchase: boolean, // ← NEW: true for mobile purchases

  // Timestamps
  purchasedAt: Timestamp,
  createdAt: Timestamp,
  date: Timestamp,
}
```

### 2. Real-Time Listener

The existing real-time listener in `shop.tsx` (lines 321-455) automatically detects and displays all purchases, including mobile purchases.

**How it works:**
1. Listens to `/dropzones/{dropzoneId}/purchases` collection
2. Filters by `customerId`
3. Updates UI immediately when changes occur
4. No page refresh needed

### 3. Data Flow

```
┌─────────────────┐
│  Cart Checkout  │
│   (cart.tsx)    │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Create Purchase Document       │
│  mobilePurchase: true           │
│  /dropzones/{id}/purchases      │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Firebase Real-Time Listener    │
│  onSnapshot() triggered         │
│  (shop.tsx)                     │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  UI Update (Instant)            │
│  - My Tickets tab               │
│  - Badge count                  │
│  - Purchase list                │
└─────────────────────────────────┘
```

## Benefits

### ✅ No New Collections
All purchases remain in the existing `purchases` collection under each dropzone.

### ✅ Backward Compatible
Existing web/POS systems continue to work without modification. The `mobilePurchase` field is optional and doesn't affect existing functionality.

### ✅ Source Tracking
Staff dashboards can filter purchases by source:
- `mobilePurchase: true` = Mobile app purchase
- `mobilePurchase: undefined` or `false` = Web/POS purchase

### ✅ Real-Time Updates
Both mobile and web purchases trigger the same real-time listener, ensuring instant UI updates.

### ✅ Unified Management
Staff can see, manage, and mark items as used/canceled for all purchases regardless of source.

## Testing

Run the test script to verify the implementation:

```bash
npx tsx scripts/test-mobile-purchase-with-listener.ts
```

**Test Results:**
- ✅ Mobile purchase created with correct schema
- ✅ Real-time listener triggered immediately
- ✅ UI updates without refresh
- ✅ Purchase visible in staff dashboard
- ✅ `mobilePurchase: true` field present

## Example Purchase

```json
{
  "accountId": "dKwmEBclVdd46rb5lxmSWuLCQwL2",
  "altitude": 13000,
  "amountCharged": 1500,
  "amountFromBalance": 0,
  "canceled": false,
  "createdAt": "2026-02-26T07:30:00Z",
  "creditUsed": 0,
  "currency": "RON",
  "customerId": "C8668912",
  "date": "2026-02-26T07:30:00Z",
  "dropzoneId": "MOjfNjZHUExnLztWXAWZ",
  "dropzoneName": "TNT Brothers Clinceni",
  "items": [
    {
      "name": "Tandem Jump",
      "quantity": 2,
      "price": 750,
      "productId": "tandem-001",
      "category": "jumps",
      "used": false,
      "canceled": false
    }
  ],
  "mobilePurchase": true,
  "paymentMethod": "card",
  "purchasedAt": "2026-02-26T07:30:00Z",
  "refNumber": "PN5LRY5FYH",
  "status": "completed",
  "subtotal": 1500,
  "total": 1500,
  "totalAmount": 1500,
  "userId": "dKwmEBclVdd46rb5lxmSWuLCQwL2",
  "validated": true
}
```

## Staff Dashboard Integration

Staff dashboards can query purchases by source:

```typescript
// All purchases
const allPurchases = query(purchasesRef);

// Only mobile purchases
const mobilePurchases = query(purchasesRef, where('mobilePurchase', '==', true));

// Only web/POS purchases
const webPurchases = query(purchasesRef, where('mobilePurchase', '==', false));
```

## Summary

Mobile purchases are now fully integrated with the existing Firebase purchase system:
- Same collection structure
- Real-time updates enabled
- Source tracking via `mobilePurchase` field
- Backward compatible with existing systems
- Staff can manage all purchases from one dashboard
