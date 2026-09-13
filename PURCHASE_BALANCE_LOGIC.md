# Purchase with Balance Deduction System

## Overview

The Shop page now implements a smart payment system that automatically deducts from the user's available balance before charging any remaining amount.

## How It Works

### Payment Priority

1. **Available Balance First**: When a purchase is made, the system first checks the user's available balance in the `credits` collection
2. **Deduct Maximum Possible**: Deducts as much as possible from the available balance (up to the full purchase amount)
3. **Charge Remaining**: Any remaining amount not covered by the balance is charged

### Examples

**Scenario 1: Full Coverage**
- Available Balance: 306 AED
- Purchase Amount: 100 AED
- Result:
  - From Balance: 100 AED
  - Charged: 0 AED
  - New Balance: 206 AED

**Scenario 2: Partial Coverage**
- Available Balance: 206 AED
- Purchase Amount: 250 AED
- Result:
  - From Balance: 206 AED
  - Charged: 44 AED
  - New Balance: 0 AED

**Scenario 3: No Coverage**
- Available Balance: 0 AED
- Purchase Amount: 100 AED
- Result:
  - From Balance: 0 AED
  - Charged: 100 AED
  - New Balance: 0 AED

## Implementation Details

### Balance Service (`lib/balanceService.ts`)

#### `getUserBalance(accountId)`
- Fetches the current balance from the Firebase `credits` collection
- Returns the most recent credit record based on `updatedAt` timestamp
- Falls back to customer's direct balance field if no credits exist

#### `processPurchaseWithBalance(accountId, purchaseAmount)`
- Calculates how much can be paid from balance vs charged
- Updates the credit record in Firebase with the new balance
- Returns a `PurchaseResult` with:
  - `amountFromBalance`: Amount deducted from balance
  - `amountCharged`: Amount that needs to be charged
  - `newBalance`: Updated balance after purchase

### Shop Page (`app/shop.tsx`)

The `handlePurchase` function now:
1. Calls `processPurchaseWithBalance()` before recording the purchase
2. Records the payment breakdown in the purchase data
3. Shows a detailed success message with:
   - Total amount
   - Amount paid from balance
   - Amount charged (if any)
   - New balance

### Purchase Record Structure

```javascript
{
  customerId: "C5836110",
  accountId: "jK2YR1tiHccHhvtL0xIzaWldVqK2",
  items: [...],
  totalAmount: 250,
  amountFromBalance: 206,
  amountCharged: 44,
  currency: "AED",
  purchasedAt: timestamp,
  status: "completed"
}
```

## Testing

Run the test script to see the balance deduction in action:

```bash
npx tsx scripts/test-purchase-with-balance.ts
```

## Real-Time Balance Updates

The Shop page now uses Firebase's real-time listeners (`onSnapshot`) to automatically update the available balance whenever changes occur in the database.

### How It Works

1. **Automatic Setup**: When the user opens the Shop page, a real-time listener is established on the `credits` collection
2. **Instant Updates**: Any changes to the user's balance (purchases, credits added, etc.) are immediately reflected in the UI
3. **No Manual Refresh Needed**: The balance updates automatically without requiring page refreshes or manual actions
4. **Efficient**: The listener only tracks the specific customer's credits, minimizing data transfer

### Benefits

- **Real-Time Sync**: Multiple devices stay in sync - if balance changes on one device, it updates on all others instantly
- **Better UX**: Users see accurate balance information at all times
- **Reduced Load**: No need for periodic polling or manual refresh calls
- **Automatic Cleanup**: The listener is properly cleaned up when the component unmounts or user changes

## UI/UX

- Available balance is displayed prominently at the top of the Shop page
- Balance updates automatically in real-time when changes occur
- Purchase success message shows a clear breakdown of payment
- No manual refresh required - changes are instantly visible
- Works across multiple devices and sessions simultaneously
