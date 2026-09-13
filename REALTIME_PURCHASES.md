# Real-Time Purchases Updates

## Overview
The shop screen now has active listeners that automatically update the purchases/tickets list whenever changes occur in Firebase.

## Implementation Details

### Location
- **File**: `app/shop.tsx`
- **Lines**: 321-455

### How It Works

1. **Multiple Dropzone Monitoring**
   - Sets up a separate listener for each dropzone in the system
   - Monitors the `purchases` subcollection under each dropzone
   - Filters purchases by the current user's `customerId`

2. **Real-Time Updates**
   - Uses Firebase's `onSnapshot` for live data synchronization
   - Automatically detects when purchases are:
     - Added (new purchase completed)
     - Modified (item marked as used/canceled)
     - Deleted (purchase removed)

3. **Data Processing**
   - Filters out canceled purchases (`canceled === true`)
   - Filters out canceled items (`item.canceled === true`)
   - Filters out used items (`item.used === true`)
   - Consolidates identical tickets from the same dropzone
   - Updates the UI instantly when data changes

4. **Cleanup**
   - Properly unsubscribes all listeners when component unmounts
   - Prevents memory leaks and unnecessary Firebase reads

### Console Logging

The feature includes detailed console logging:
- `✅ Setting up real-time purchases listener for dropzone: [name]` - When listener starts
- `📡 [Dropzone] purchases updated: X tickets` - When data changes for a specific dropzone
- `📡 Tickets updated in real-time: Total displayed: X` - When consolidated tickets update
- `🧹 Cleaning up purchases listeners` - When listeners are removed

### Features

1. **Automatic Updates**: No manual refresh needed
2. **Multi-Dropzone Support**: Tracks purchases across all dropzones
3. **Smart Filtering**: Only shows active, unused tickets
4. **Badge Notifications**: Shows badge when new tickets are available
5. **Efficient**: Only listens to purchases for the current user

### User Experience

- When a user purchases a ticket, it appears instantly in their "My Tickets" tab
- When a ticket is used or canceled, it disappears automatically
- The badge indicator updates in real-time to show new tickets
- Works across all dropzones the user has purchases from

## Testing

You can test the real-time updates by:
1. Making a purchase in the shop
2. Watching the "My Tickets" tab update instantly
3. The badge should appear if you haven't viewed the new tickets yet

## Code Structure

```typescript
useEffect(() => {
  if (!user) return;
  
  // For each dropzone:
  //   1. Query purchases where customerId matches user
  //   2. Set up onSnapshot listener
  //   3. Process and consolidate tickets
  //   4. Update state (triggers UI re-render)
  
  return () => {
    // Clean up all listeners
  };
}, [user]);
```

## Benefits

- **No Polling**: More efficient than repeatedly checking for updates
- **Instant Feedback**: Users see changes immediately
- **Lower Latency**: Firebase handles real-time sync efficiently
- **Better UX**: Feels more responsive and modern
