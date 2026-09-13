# Real-Time Shop Updates

This document describes the real-time update system implemented for the shop and dropzone management screens.

## Overview

The application now uses Firebase Firestore's real-time listeners (`onSnapshot`) to automatically update the UI whenever products, categories, or check-in status changes. This provides a seamless experience where users see changes immediately without needing to refresh.

## Implementation Details

### Shop Screen (`app/shop.tsx`)

#### Check-In Status Listener
- **What it listens to**: Customer document's `currentDropzone` field
- **When it activates**: When user logs in
- **What it updates**: Current dropzone information, triggers product reload
- **Location**: Lines 65-108

```typescript
// Automatically updates when user checks in/out or switches dropzones
onSnapshot(customerDocRef, (doc) => {
  const checkIn = doc.data().currentDropzone || null;
  setCurrentCheckIn(checkIn);
});
```

#### Products Listener
- **What it listens to**: `dropzones/{dropzoneId}/shop_products` collection
- **When it activates**: When user is checked in to a dropzone
- **What it updates**: Product list, categories, UI state
- **Location**: Lines 110-127

```typescript
// Automatically updates when products are added, modified, or removed
onSnapshot(productsRef, (snapshot) => {
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setProducts(products);
  // Categories are derived from products
  setCategories(uniqueCategories);
});
```

### Manage Dropzone Products Screen (`app/manage-dropzone-products.tsx`)

#### Products and Categories Listener
- **What it listens to**: `dropzones/{dropzoneId}/shop_products` collection
- **When it activates**: When a dropzone is selected
- **What it updates**: Product list, derived categories
- **Location**: Lines 54-111

```typescript
// Automatically updates when admin adds, edits, or deletes products
onSnapshot(productsRef, (snapshot) => {
  const productList = snapshot.docs.map(doc => ({...}));
  setProducts(productList);
  // Categories are automatically derived from products
});
```

### Home Screen (`app/(tabs)/index.tsx`)

#### Check-In Status Listener
- **What it listens to**: Customer document's `currentDropzone` field
- **When it activates**: When user logs in
- **What it updates**: Check-in card showing current dropzone
- **Location**: Lines 155-187

```typescript
// Automatically updates check-in card when status changes
onSnapshot(customerDocRef, (doc) => {
  const data = doc.data();
  setCurrentCheckIn(data.currentDropzone || null);
});
```

## User Experience Benefits

### For Customers

1. **Instant Shop Updates**
   - New products appear immediately when added by staff
   - Price changes reflect instantly
   - Out-of-stock items disappear in real-time

2. **Seamless Dropzone Switching**
   - Product catalog automatically changes when switching dropzones
   - No manual refresh needed
   - Check-in status always accurate

3. **Live Balance Updates**
   - Account balance updates immediately after purchases
   - Ticket counts update in real-time

### For Staff/Admins

1. **Immediate Feedback**
   - See product changes reflected instantly
   - Toggle product availability with instant UI update
   - Delete confirmation with automatic list update

2. **No Refresh Required**
   - All changes propagate automatically
   - Multiple staff can manage products simultaneously
   - Changes visible to all users instantly

## Data Flow

```
Firebase Firestore
       ↓
  onSnapshot()
       ↓
  State Update
       ↓
    UI Render
```

### Example: Adding a Product

1. Admin adds product via manage screen
2. `addDoc()` writes to `shop_products` collection
3. Firestore triggers `onSnapshot()` callback
4. Both manage screen AND customer shop screens update
5. UI shows new product instantly

### Example: Switching Dropzones

1. Customer selects different dropzone
2. `checkInToDropzone()` updates customer document
3. Check-in listener triggers on home and shop screens
4. Shop screen's products listener unsubscribes from old dropzone
5. New products listener subscribes to new dropzone
6. UI shows products from new dropzone

## Technical Notes

### Cleanup

All listeners are properly cleaned up when:
- Component unmounts
- User logs out
- Dropzone selection changes
- App navigates away from screen

This prevents memory leaks and unnecessary Firebase reads.

### Performance

- Listeners only activate when needed
- Old listeners are unsubscribed before creating new ones
- Filters applied (e.g., `active: true`) to reduce data transfer
- Categories are derived from products (no separate listener needed)

### Error Handling

All listeners include error callbacks:

```typescript
onSnapshot(ref,
  (snapshot) => { /* success */ },
  (error) => { console.error(error); }
);
```

## Testing

### Automated Tests

Run these scripts to verify real-time functionality:

```bash
# Test shop product updates
npx tsx scripts/test-realtime-shop.ts

# Test complete flow (check-in + products)
npx tsx scripts/test-complete-realtime-flow.ts
```

### Manual Testing

1. Open app on two devices/browsers
2. Check in to same dropzone on both
3. On device 1: Add/edit product via manage screen
4. On device 2: Watch shop screen update automatically

## Future Enhancements

Possible improvements:
- Add optimistic updates for better perceived performance
- Implement retry logic for failed updates
- Add offline support with Firebase persistence
- Show loading indicators during listener setup
- Add visual feedback when updates occur (subtle animation)

## Troubleshooting

### Products not updating

1. Check Firebase console for data changes
2. Verify listener is active (check console logs)
3. Confirm correct subcollection name (`shop_products` not `products`)
4. Check Firebase rules allow read access

### Multiple updates firing

This is normal behavior when:
- Initial snapshot loads
- Each document change triggers update
- Switching dropzones triggers cleanup and new listener

### Listener not cleaning up

Verify return statement in useEffect:

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(...);
  return () => unsubscribe();
}, [dependencies]);
```
