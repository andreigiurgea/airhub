# Testing Real-Time Shop Updates

## How to Verify Real-Time Updates Are Working

The shop screen now has real-time listeners that automatically update the UI when products change. Here's how to verify everything is working correctly.

## Quick Test (Using Two Devices/Browsers)

### Setup
1. **Device 1**: Log in and navigate to the Shop screen
2. **Device 2**: Log in as admin and navigate to Manage Products screen

### Test Steps

1. **On Device 1** (Customer):
   - Check in to a dropzone
   - Navigate to Shop
   - Keep the shop screen open

2. **On Device 2** (Admin):
   - Select the same dropzone
   - Add a new product
   - **Expected Result**: Product should appear on Device 1 immediately without refreshing

3. **On Device 2** (Admin):
   - Update the product price
   - **Expected Result**: Price changes on Device 1 immediately

4. **On Device 2** (Admin):
   - Toggle product to inactive
   - **Expected Result**: Product disappears from Device 1 shop (filtered out)

5. **On Device 2** (Admin):
   - Delete the product
   - **Expected Result**: Product is removed from Device 1 immediately

## Monitoring Real-Time Updates

### Console Logs to Watch For

When the shop screen is active, you should see these console messages:

#### Initial Setup
```
✅ Setting up real-time check-in listener
✅ Setting up real-time products listener for: [Dropzone Name]
```

#### When Products Change
```
📡 Products updated: 5 active products from [Dropzone Name]
```

#### When Check-In Changes
```
📡 Check-in status updated: [Dropzone Name]
```

#### When Cleaning Up
```
🧹 Cleaning up products listener (dropzone changed or unmounting)
🧹 Cleaning up check-in listener (component unmounting)
```

### Warning Signs

If you see these, there might be an issue:

```
⚠️ Products listener already exists, cleaning up old one
⚠️ Check-in listener already exists, cleaning up old one
```

This usually means the component is re-rendering unexpectedly, but the listeners will be properly cleaned up and recreated.

```
❌ Products listener error: [error message]
❌ Check-in listener error: [error message]
```

This indicates a Firebase connection or permission issue.

## Automated Tests

Run these scripts to verify the real-time functionality:

### Test 1: Basic Shop Listener
```bash
npx tsx scripts/test-shop-active-listener.ts
```

**What it tests**:
- Listener stays active while screen is open
- Product additions are detected
- Product updates are detected
- Product deactivation is detected
- Product deletion is detected

**Expected output**:
```
✅ SUCCESS: Listener remained active and received all updates!
```

### Test 2: Complete Real-Time Flow
```bash
npx tsx scripts/test-complete-realtime-flow.ts
```

**What it tests**:
- Check-in listener works
- Products listener activates after check-in
- Switching dropzones updates products
- Listeners clean up properly

**Expected output**:
```
✓ All real-time listeners working correctly!
```

## Troubleshooting

### Problem: Products don't update automatically

**Possible causes**:
1. Component is being unmounted when navigating away
2. Firebase connection is lost
3. Listener was not set up correctly

**Debug steps**:
1. Check console for listener setup messages
2. Verify you see `📡 Products updated` messages
3. Check Firebase console for data changes
4. Run the automated test scripts

**Solution**:
- The listeners use refs to persist across re-renders
- Check console logs to see if listeners are being cleaned up unexpectedly

### Problem: Multiple updates firing

**This is normal** when:
- Initial data loads (1 update)
- Each document change (1 update per change)
- Switching dropzones (cleanup + new listener)

**Not normal** when:
- Same update fires multiple times within seconds
- Listener keeps recreating without reason

**Debug**:
Look for warning messages about duplicate listeners.

### Problem: Updates only work when accessing the page

**Symptoms**:
- Products update when you navigate to the shop
- Products don't update while on the shop screen

**This should NOT happen with the current implementation because**:
- Listeners are set up in `useEffect` and stay active
- Refs prevent accidental cleanup
- Each listener has error handlers

**If this happens**:
1. Check console logs for cleanup messages
2. Verify the component isn't unmounting
3. Check if navigation puts the screen in the background

**Debug test**:
```bash
# This simulates the shop screen staying open
npx tsx scripts/test-shop-active-listener.ts
```

If this test passes but the app doesn't work, it's likely a React Native navigation issue.

## How the Real-Time System Works

### Architecture

```
Firebase Firestore
       ↓
  onSnapshot() ← Listener stays active
       ↓
  Callback fires on ANY change
       ↓
  State updates (setProducts, setCategories)
       ↓
  React re-renders UI
       ↓
  User sees updated products instantly
```

### Key Features

1. **Persistent Listeners**
   - Listeners stay active as long as component is mounted
   - Refs prevent accidental cleanup during re-renders
   - Proper cleanup when unmounting or switching dropzones

2. **Automatic Updates**
   - No polling required
   - No manual refresh needed
   - Changes appear in milliseconds

3. **Smart Filtering**
   - Only active products shown (filter on client)
   - Categories derived from products automatically
   - Efficient data transfer

4. **Error Handling**
   - Each listener has error callback
   - Errors logged but don't crash app
   - Loading state handled properly

## Performance Considerations

### Firebase Read Costs

Each listener update counts as 1 read per document:
- Initial setup: 1 read per product
- Each product change: 1 read for that product only
- NOT billed when no changes occur

**Example**:
- 10 products in shop
- Admin adds 1 product
- Customer's listener: 1 read (only the new product)
- NOT 11 reads (Firestore is smart about this)

### Memory Usage

Listeners are properly cleaned up:
- When component unmounts
- When switching dropzones
- When user logs out

No memory leaks should occur.

### Network Usage

Listeners maintain a persistent WebSocket connection:
- Low overhead when idle
- Instant updates when changes occur
- Automatically reconnects if connection drops

## Best Practices

### For Development

1. Always check console logs
2. Use automated tests before manual testing
3. Test with multiple devices/browsers
4. Monitor Firebase console for data changes

### For Production

1. Monitor Firebase usage in console
2. Set up appropriate security rules
3. Consider offline persistence if needed
4. Test with poor network conditions

## Additional Notes

### React Native Navigation

If using tab navigation or stack navigation:
- Component may unmount when navigating away
- Listeners will be cleaned up automatically
- Listeners will be recreated when returning to screen

This is expected behavior and handled correctly.

### Offline Support

Current implementation:
- Requires active connection
- Updates stop if offline
- Reconnects automatically when back online

To add offline support:
```typescript
// Enable offline persistence (add to firebase.ts)
enableMultiTabIndexedDbPersistence(db);
```

### Security

Ensure Firebase rules allow:
- Authenticated users to read products
- Only admins to write products

Example rule:
```javascript
match /dropzones/{dropzoneId}/shop_products/{productId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && isAdmin();
}
```
