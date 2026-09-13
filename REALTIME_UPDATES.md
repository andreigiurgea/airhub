# Real-Time Updates Implementation

This document describes the real-time update functionality implemented across the application using Firebase's `onSnapshot` listeners.

## Overview

The application now uses Firebase's real-time listeners to automatically update the UI when data changes in the database. This provides a seamless, live experience where changes are reflected instantly without requiring manual refreshes.

## Implemented Features

### 1. Shop - Balance Updates

**Location**: `app/shop.tsx`

**What Updates**:
- Available balance amount
- Currency display

**How It Works**:
- Establishes a real-time listener on the `credits` collection when the user opens the Shop page
- Monitors the user's credit balance continuously
- Updates the balance display instantly when:
  - Purchases are made
  - Credits are added to the account
  - Any balance changes occur

**Benefits**:
- No need to manually refresh after purchases
- Balance stays accurate across multiple devices
- Instant feedback on transactions

### 2. Logbook - Statistics Updates

**Location**: `app/logbook.tsx`

**What Updates**:
- Total jumps count badge
- Pending signatures count badge

**How It Works**:
- Sets up a real-time listener on the `logbook` collection
- Tracks all jump entries for the current user
- Counts total jumps and pending signatures in real-time
- Updates badge counts instantly when:
  - New jump entries are created
  - Jump status changes (draft → pending_signature → signed)
  - Jump entries are modified

**Benefits**:
- Always shows current jump statistics
- Pending signature badge updates immediately
- Helps users stay informed about their logbook status

### 3. View Jumps - Jump List Updates

**Location**: `app/view-jumps.tsx`

**What Updates**:
- Complete list of jump entries
- Jump status badges
- Jump details

**How It Works**:
- Maintains a real-time listener on the `logbook` collection filtered by customer ID
- Sorts jumps by creation date (most recent first)
- Updates the list instantly when:
  - New jumps are added
  - Jump details are modified
  - Status changes occur
  - Jumps are deleted

**Benefits**:
- List stays current across all devices
- See new jumps appear immediately after load completion
- Status changes reflect instantly

### 4. Jump Details - Individual Jump Updates

**Location**: `app/jump-details.tsx`

**What Updates**:
- All jump information fields
- Jump status
- Form data

**How It Works**:
- Listens to a specific jump document in the `logbook` collection
- Updates all form fields when the document changes
- Reflects changes made by other users or processes instantly

**Benefits**:
- See status changes immediately (e.g., when instructor signs the jump)
- Prevents editing conflicts
- Always displays the latest jump information

## Technical Implementation

### Pattern Used

All real-time updates follow this consistent pattern:

```typescript
useEffect(() => {
  if (!requiredData) return;

  let unsubscribe: (() => void) | null = null;

  const setupListener = () => {
    try {
      const ref = collection(db, 'collection_name');
      const q = query(ref, where('field', '==', value));

      unsubscribe = onSnapshot(q, (snapshot) => {
        // Process updates
        const data = [];
        snapshot.forEach((doc) => {
          data.push(doc.data());
        });

        // Update state
        setState(data);
      }, (error) => {
        console.error('Error:', error);
      });
    } catch (error) {
      console.error('Setup error:', error);
    }
  };

  setupListener();

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}, [requiredData]);
```

### Key Principles

1. **Automatic Connection**: Listeners are established automatically when components mount
2. **Proper Cleanup**: Listeners are unsubscribed when components unmount to prevent memory leaks
3. **Error Handling**: All listeners include error callbacks for robust error handling
4. **Dependency Management**: useEffect dependencies ensure listeners restart when needed
5. **Efficient Queries**: Listeners only watch relevant data to minimize bandwidth

## Performance Considerations

### Optimizations

- **Filtered Queries**: All listeners use `where` clauses to only watch relevant documents
- **Single Customer Data**: Listeners are scoped to the current user's data only
- **Automatic Cleanup**: Listeners are properly unsubscribed to prevent memory leaks
- **Minimal Re-renders**: State updates only trigger when actual data changes

### Bandwidth Usage

- Firebase charges for document reads from real-time listeners
- Each update counts as one read per document
- Queries are optimized to watch only necessary documents
- Listeners are unsubscribed when not needed

## Testing

### Manual Testing

1. Open the app on two devices/browsers
2. Make a purchase on one device
3. Watch the balance update instantly on both
4. Create a jump entry and see it appear immediately
5. Change jump status and observe real-time badge updates

### Automated Testing

Run the test scripts to verify real-time functionality:

```bash
# Test balance updates
npx tsx scripts/test-realtime-balance.ts

# Test logbook updates
npx tsx scripts/test-logbook-realtime.ts
```

## User Experience Benefits

1. **Instant Feedback**: Users see changes immediately without refreshing
2. **Multi-Device Sync**: Works seamlessly across multiple devices
3. **Collaborative Features**: Multiple users can see each other's updates
4. **Always Current**: Data is never stale or outdated
5. **Professional Feel**: Creates a modern, responsive application experience

## Future Enhancements

Potential areas for additional real-time updates:

- Load status changes and passenger lists
- Dropzone information updates
- Real-time notifications
- Live chat/messaging features
- Equipment availability tracking
- Weather updates
- Manifest changes

## Troubleshooting

### Common Issues

**Listener Not Updating**:
- Check console logs for listener setup messages
- Verify customer ID is correctly fetched
- Ensure Firebase permissions allow reads
- Check network connectivity

**Multiple Updates Triggering**:
- Normal behavior - Firebase triggers once per affected document
- Check for duplicate listener setup
- Verify cleanup functions are working

**Performance Issues**:
- Review query complexity
- Check number of documents being watched
- Consider pagination for large datasets
- Monitor Firebase console for usage patterns

### Debug Logging

All listeners include console logging:
- Setup messages confirm listener activation
- Update messages show when changes occur
- Cleanup messages confirm proper unsubscription
- Error messages help identify issues

Check the console for messages like:
- `Setting up real-time balance listener for customer: ...`
- `Balance updated in real-time: ...`
- `Cleaning up balance listener`
