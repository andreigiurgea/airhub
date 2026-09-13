# Purchase Flow Documentation

This document describes the complete purchase flow in the application, from adding products to the cart to viewing purchased tickets.

## Flow Overview

```
Shop → Add to Cart → Cart Review → Payment Method Selection → Purchase → My Tickets
```

## Step-by-Step Process

### 1. Browse Products (Shop Page)

**Location**: `app/shop.tsx`

Users can:
- View products organized by category
- Adjust quantity using +/- buttons
- Add items to cart using the shopping cart button
- View their available balance at the top
- See cart badge showing total items in cart

**Key Features**:
- Collapsible categories for better organization
- Real-time balance display
- Quantity controls before adding to cart
- Cart badge updates instantly when items are added

### 2. Add Products to Cart

When the user clicks the cart button on a product:
- The selected quantity is added to the cart
- Cart data is saved to localStorage (persists across sessions)
- Success message confirms the addition
- Cart badge updates to show new total

**Technical Details**:
- Cart is stored per user: `cart_{userId}`
- Format: `{ productId: quantity, ... }`
- Cart syncs across tabs/windows

### 3. Review Cart (Cart Page)

**Location**: `app/cart.tsx`

Users can:
- View all items in their cart
- See individual item totals and quantities
- Adjust quantities or remove items
- View current balance
- Select payment method
- Review order summary

**Cart Management**:
- Increase/decrease quantity with +/- buttons
- Remove items with trash icon
- Real-time price calculations
- Empty cart state with "Go to Shop" button

### 4. Select Payment Method

Three payment options are available:

#### Option 1: Balance
- Uses customer's available balance
- Shows current balance amount
- Automatically selected if sufficient balance
- Combines balance with card if insufficient

**How it works**:
- If balance >= total: Purchase completes using balance only
- If balance < total: Shows insufficient balance alert
- User can switch to cash or card payment

#### Option 2: Cash
- Full amount paid in cash at the dropzone
- No balance deduction
- Manual payment confirmation by staff

#### Option 3: Card
- Full amount charged to card
- Simulated card payment
- In production, would integrate with payment gateway

**Payment Method Selection**:
- Radio button interface
- Shows balance amount for context
- Icons for visual clarity
- Clear indication of selected method

### 5. Complete Purchase (Checkout)

When user clicks "Checkout":

1. **Validation**
   - Checks if cart is empty
   - Verifies user is logged in
   - Validates balance if using balance payment

2. **Payment Processing**
   - Balance payment: Calls `processPurchaseWithBalance()`
   - Cash/Card: Records payment method for later processing

3. **Database Operations**
   - Creates purchase record in `purchases` collection
   - Creates ticket records in customer's `tickets` subcollection
   - Records payment details and method

4. **Cart Cleanup**
   - Clears cart from state
   - Removes cart data from localStorage
   - Resets quantities

5. **Confirmation**
   - Shows professional success screen with:
     - Green checkmark icon
     - "Thank You!" message
     - Payment details section
     - Product images/icons
     - Reference number (purchase ID)
     - Date and time of purchase
     - Payment method used
     - Total amount paid
     - PDF receipt download button
     - "Continue shopping" button
   - Navigates to shop after confirmation

### 6. View Purchased Tickets (My Tickets Tab)

**Location**: `app/shop.tsx` (tickets tab)

Users can see:
- All purchased tickets
- Ticket type and dropzone
- Quantity and altitude
- Individual prices
- Real-time updates when new purchases are made

**Key Features**:
- Tickets are consolidated by type and price
- Badge shows total number of ticket types
- Real-time listener updates list automatically
- Tickets persist across sessions

## Database Schema

### Purchases Collection

```typescript
{
  customerId: string;          // Customer ID reference
  accountId: string;           // User account ID
  items: [{
    name: string;              // Product name
    quantity: number;          // Quantity purchased
    price: number;             // Unit price
    productId: string;         // Product reference
    category: string;          // Product category
  }];
  totalAmount: number;         // Total purchase amount
  amountFromBalance: number;   // Amount paid from balance
  amountCharged: number;       // Amount charged (cash/card)
  paymentMethod: string;       // 'balance' | 'cash' | 'card'
  currency: string;            // Currency code (AED)
  dropzoneName: string;        // Dropzone name
  altitude: number;            // Jump altitude
  purchasedAt: timestamp;      // Purchase timestamp
  status: string;              // 'completed'
}
```

### Customer Tickets Subcollection

Path: `customers/{customerId}/tickets`

```typescript
{
  ticketType: string;          // Ticket type name
  quantity: number;            // Number of tickets
  price: number;               // Unit price
  currency: string;            // Currency code
  dropzoneName: string;        // Dropzone name
  altitude: number;            // Jump altitude
  purchasedAt: timestamp;      // Purchase timestamp
}
```

## Balance Payment Logic

The balance payment system follows these rules:

1. **Sufficient Balance**:
   - Full amount deducted from balance
   - `amountFromBalance = totalAmount`
   - `amountCharged = 0`

2. **Partial Balance**:
   - All available balance used first
   - Remaining charged to card
   - `amountFromBalance = currentBalance`
   - `amountCharged = totalAmount - currentBalance`

3. **Insufficient Balance**:
   - User alerted about shortage
   - Option to switch to cash/card
   - Can continue with alternative payment

4. **No Balance**:
   - User must select cash or card
   - No balance deduction
   - `amountFromBalance = 0`
   - `amountCharged = totalAmount`

## Real-Time Updates

### Shop Page
- Balance updates automatically when purchases are made
- No manual refresh needed
- Updates across all open tabs/windows

### My Tickets Tab
- New tickets appear immediately after purchase
- Quantity updates in real-time
- Consolidated view updates automatically

### Cart Badge
- Updates when items are added
- Syncs across all pages
- Persists in localStorage

## Error Handling

### Common Scenarios

1. **Empty Cart**:
   - Alert: "Your cart is empty"
   - User returned to cart page

2. **Insufficient Balance**:
   - Alert with exact shortage amount
   - Options to switch payment method
   - Helpful prompts for alternatives

3. **User Not Logged In**:
   - Redirects to login page
   - Cart persists after login

4. **Customer Not Found**:
   - Alert: "Customer profile not found"
   - User should contact support

5. **Payment Processing Failure**:
   - Alert with error message
   - Cart preserved for retry
   - No charges applied

## User Experience Features

### Visual Feedback
- Loading states during processing
- Success confirmations
- Clear error messages
- Disabled buttons during processing

### Persistence
- Cart survives browser refresh
- Cart maintained across sessions
- Balance updates automatically
- Purchase history preserved

### Navigation
- Easy back navigation
- Cart accessible from shop header
- Direct navigation to tickets after purchase
- Breadcrumb-style flow

### Convenience
- Quantity controls at multiple points
- Quick add from product cards
- Batch purchases supported
- Multiple payment options

## Testing

### Manual Testing Steps

1. **Add to Cart Flow**:
   - Browse products in shop
   - Adjust quantity to 2
   - Click cart icon
   - Verify success message
   - Check cart badge updates

2. **Cart Review Flow**:
   - Click cart icon in header
   - Verify products appear
   - Test quantity adjustment
   - Test remove item
   - Verify price calculations

3. **Payment Selection Flow**:
   - View available balance
   - Select each payment method
   - Verify radio button selection
   - Check payment method indicators

4. **Purchase Flow (Balance)**:
   - Add items to cart
   - Select balance payment
   - Click checkout
   - Verify balance deduction
   - Check tickets appear

5. **Purchase Flow (Cash)**:
   - Add items to cart
   - Select cash payment
   - Click checkout
   - Verify no balance change
   - Check tickets appear

6. **Purchase Flow (Card)**:
   - Add items to cart
   - Select card payment
   - Click checkout
   - Verify payment recorded
   - Check tickets appear

### Automated Testing

Run the test script:

```bash
npx tsx scripts/test-cart-purchase-flow.ts
```

This tests:
- Customer lookup
- Product retrieval
- Balance checking
- Payment processing
- Purchase recording
- Ticket creation
- Data verification

## Future Enhancements

Potential improvements to the purchase flow:

1. **Multi-Dropzone Support**
   - Select dropzone in cart
   - Different products per dropzone
   - Dropzone-specific pricing

2. **Discount Codes**
   - Apply promo codes at checkout
   - Percentage or fixed discounts
   - Limited-time offers

3. **Saved Payment Methods**
   - Store card details securely
   - Quick checkout with saved cards
   - Default payment method

4. **Order History**
   - View past purchases
   - Reorder previous items
   - Download receipts

5. **Gift Cards**
   - Purchase gift cards
   - Apply gift cards to purchases
   - Gift card balance tracking

6. **Booking Integration**
   - Book loads directly from tickets
   - Automatic ticket consumption
   - Load availability checking

## Troubleshooting

### Cart Not Showing Items

**Possible Causes**:
- localStorage not accessible
- User changed devices/browsers
- Cart data corrupted

**Solutions**:
- Check browser localStorage
- Re-add items to cart
- Clear browser cache

### Balance Not Updating

**Possible Causes**:
- Real-time listener not connected
- Network connectivity issues
- Firebase permissions

**Solutions**:
- Refresh the page
- Check internet connection
- Verify Firebase setup

### Tickets Not Appearing

**Possible Causes**:
- Purchase not completed
- Database write failed
- Customer ID mismatch

**Solutions**:
- Check purchase records
- Verify customer profile
- Contact support with purchase ID

### Payment Failed

**Possible Causes**:
- Insufficient balance
- Database connection issues
- Invalid payment data

**Solutions**:
- Check balance amount
- Try alternative payment method
- Retry purchase

## Security Considerations

### Data Protection
- User-specific cart storage
- Secure payment processing
- Protected customer data

### Validation
- Server-side price verification
- Balance checks before deduction
- Quantity limits enforced

### Audit Trail
- All purchases recorded
- Payment methods logged
- Timestamps for all transactions

## Support

For issues with the purchase flow:
1. Check error messages for details
2. Verify account balance
3. Review purchase history
4. Contact support with:
   - Purchase ID (if available)
   - Error messages
   - Steps to reproduce
   - Account information
