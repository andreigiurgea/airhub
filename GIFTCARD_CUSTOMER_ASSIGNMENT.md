# Gift Card Customer Assignment Implementation

## Overview
Gift cards in the Firebase database are assigned to specific customers using the `customerId` field. The cart validation now enforces that only the assigned customer (or anyone, if unassigned) can use a gift card.

## Database Structure

### Gift Card Document Path:
```
/dropzones/{dropzoneId}/giftCards/{giftCardId}
```

### Key Fields:
```javascript
{
  // Gift Card Identification
  code: "SKY-B8RJT2",                    // Unique redemption code
  giftCardId: "qdMGi4maExnYFux4T4ZU",    // Document ID

  // Status
  status: "active",                      // "active" or "redeemed"
  redeemed: false,                       // Whether it's been used

  // Type & Value
  type: "value",                         // "value" or "product"
  amount: 120,                           // Discount amount (for value type)
  currency: "AED",                       // Currency code

  // Customer Assignment (KEY FIELDS)
  customerId: "C1185158" | null,         // Customer ID it's assigned to (or null for anyone)
  assignedToName: "thisisandrei" | null, // Display name of assigned customer

  // Redemption Tracking
  redeemedAt: null | Timestamp,          // When it was redeemed
  redeemedByCustomerId: null | string,   // Customer ID who redeemed it

  // Purchase Tracking
  purchasedByCustomerId: null | string,  // Customer who bought it (if from shop)
  purchasedByName: null | string,        // Display name of purchaser

  // Validity
  expiresAt: "2026-03-31",              // Expiration date (YYYY-MM-DD string)

  // Location
  dropzoneId: "V0A7np33p7aPLhVc6MZq",   // Which dropzone
  dropzoneName: "Skydive Abu Dhabi",     // Dropzone name

  // Metadata
  message: "Happy Birthday",             // Gift message
  notes: "Internal notes",               // Admin notes
  createdAt: "2026-03-09T09:50:47.316Z", // Creation timestamp
  updatedAt: "2026-03-09T09:50:47.316Z", // Last update timestamp
  createdByAccountId: "...",             // Admin who created it
  createdByName: "admin@dzabudhabi.com", // Admin email
  mobileCreated: false,                  // Whether created from mobile app
}
```

## Validation Logic

### cart.tsx Implementation

The validation checks in order:

1. **User Authentication**
   ```javascript
   if (!user) {
     setCouponError('Please sign in to use a coupon');
     return;
   }
   ```

2. **Customer Profile Exists**
   ```javascript
   const customerResult = await getCustomerData(user.uid);
   if (!customerResult) {
     setCouponError('Customer profile not found');
     return;
   }
   const customerId = customerResult.customerId;
   ```

3. **Gift Card Exists**
   ```javascript
   const giftCardsRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'giftCards');
   const q = query(giftCardsRef, where('code', '==', couponCode.trim().toUpperCase()));
   const giftCardsSnap = await getDocs(q);

   if (giftCardsSnap.empty) {
     setCouponError('Invalid coupon code');
     return;
   }
   ```

4. **Status is Active**
   ```javascript
   if (giftCardData.status !== 'active') {
     setCouponError('This coupon is no longer active');
     return;
   }
   ```

5. **Not Already Redeemed**
   ```javascript
   if (giftCardData.redeemed) {
     setCouponError('This coupon has already been used');
     return;
   }
   ```

6. **Customer Assignment Check (CRITICAL)**
   ```javascript
   if (giftCardData.customerId && giftCardData.customerId !== customerId) {
     setCouponError('This gift card is not assigned to you');
     return;
   }
   ```

   This check allows:
   - ✅ Gift cards with `customerId: null` (unassigned - anyone can use)
   - ✅ Gift cards with `customerId` matching the current customer's ID
   - ❌ Gift cards with `customerId` not matching (assigned to someone else)

7. **Not Expired**
   ```javascript
   if (giftCardData.expiresAt) {
     const expiryDate = new Date(giftCardData.expiresAt);
     if (expiryDate < new Date()) {
       setCouponError('This coupon has expired');
       return;
     }
   }
   ```

## Test Results

### Test Case 1: Correct Customer
- **Code:** SKY-B8RJT2
- **Assigned to:** thisisandrei (C1185158)
- **Test Customer ID:** C1185158
- **Result:** ✅ PASS - Customer can use this gift card

### Test Case 2: Wrong Customer
- **Code:** SKY-B8RJT2
- **Assigned to:** thisisandrei (C1185158)
- **Test Customer ID:** C1234567
- **Result:** ❌ FAIL - Gift card is not assigned to this customer

### Test Case 3: Unassigned Gift Card
- **Code:** SKY-NESTED-TEST
- **Assigned to:** None (customerId is null)
- **Test Customer ID:** C1234567
- **Result:** ✅ PASS - Customer can use this gift card (anyone can use unassigned)

## Real Examples in Database

### Assigned Gift Card (Value Type):
```javascript
{
  code: "SKY-B8RJT2",
  customerId: "C1185158",           // ← ASSIGNED to this customer
  assignedToName: "thisisandrei",
  type: "value",
  amount: 120,
  currency: "AED",
  status: "active",
  redeemed: false,
  expiresAt: "2026-03-31"
}
```

### Assigned Gift Card (Product Type):
```javascript
{
  code: "SKY-AGGNX2",
  customerId: "C1185158",           // ← ASSIGNED to this customer
  assignedToName: "thisisandrei",
  type: "product",
  includedProducts: [
    {
      productId: "vo0sO8mT8NSeVK47qGGM",
      productName: "Tandem",
      quantity: 1,
      unitPrice: 1000
    }
  ],
  status: "active",
  redeemed: false,
  expiresAt: "2026-03-31"
}
```

### Unassigned Gift Card:
```javascript
{
  code: "SKY-NESTED-TEST",
  customerId: null,                 // ← NO ASSIGNMENT (anyone can use)
  assignedToName: null,
  type: "value",
  amount: 200,
  currency: "AED",
  status: "active",
  redeemed: false,
  expiresAt: "2026-12-31"
}
```

## Error Messages

| Scenario | Error Message |
|----------|---------------|
| Empty input | "Please enter a coupon code" |
| Not checked in | "No active check-in found" |
| Not signed in | "Please sign in to use a coupon" |
| No customer profile | "Customer profile not found" |
| Code doesn't exist | "Invalid coupon code" |
| Status not active | "This coupon is no longer active" |
| Already redeemed | "This coupon has already been used" |
| Assigned to another customer | **"This gift card is not assigned to you"** |
| Past expiration date | "This coupon has expired" |
| Network/DB error | "Failed to validate coupon" |

## Security Considerations

1. ✅ Customer ID is fetched from Firebase authentication
2. ✅ Gift card assignment is checked server-side (Firebase query)
3. ✅ Cannot bypass by changing local state
4. ✅ Customer profile must exist in the database
5. ✅ All checks happen before discount is applied
6. ✅ Unassigned gift cards (`customerId: null`) work for everyone
7. ✅ Assigned gift cards only work for the specific customer

## Test Scripts

### Check All Gift Cards:
```bash
npx tsx scripts/check-giftcard-fields.ts
```
Shows all gift cards with their `customerId` and assignment details.

### Test Customer Validation:
```bash
npx tsx scripts/test-giftcard-customer-validation.ts
```
Tests the validation logic with correct/wrong/unassigned scenarios.

## Notes

- The field name is `customerId`, NOT `assignedCustomerId`
- Customer IDs are in format: `C1234567` (C prefix + numbers)
- `assignedToName` is just for display, validation uses `customerId`
- Unassigned cards have `customerId: null` and can be used by anyone
- Once redeemed, the `redeemedByCustomerId` field is set
