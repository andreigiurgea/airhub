# Manifest Synchronization Fix

## Issue

When a jumper is manifested by staff on multiple loads, the mobile app wasn't properly reflecting this state, potentially allowing the jumper to self-manifest again or showing incorrect button states.

## Root Cause

The loads listener (`useEffect` hook) was only dependent on `currentCheckIn`, not on `currentCustomerId`. This created a race condition where:

1. Loads would be fetched and rendered
2. `currentCustomerId` would be set later
3. The manifest check functions would run with `null` or `undefined` customerId
4. Button states would be calculated incorrectly

## Fix Applied

### 1. Added `currentCustomerId` Dependency

```typescript
}, [currentCheckIn, currentCustomerId]); // Added currentCustomerId
```

This ensures the loads are re-evaluated whenever the customerId changes, fixing the race condition.

### 2. Enhanced Logging

Added comprehensive console logging to help debug manifest issues:

```typescript
// In loads listener
console.log('🔄 Real-time loads update - Documents found:', snapshot.size);
console.log('📍 Current customerId:', currentCustomerId);

// For each load
console.log(`📦 Load ${doc.id} (Load #${data.loadNumber}):`, {
  jumpers: data.jumpers?.length || 0,
  status: data.status
});

// For each jumper on the load
if (data.jumpers && data.jumpers.length > 0) {
  data.jumpers.forEach((jumper: any, idx: number) => {
    console.log(`  👤 Jumper ${idx + 1}:`, {
      name: jumper.name || `${jumper.firstName} ${jumper.lastName}`,
      customerId: jumper.customerId,
      id: jumper.id
    });
  });
}

// In render function
console.log(`Load #${item.loadNumber}:`, {
  isManifested,
  isManifestedOnAnyLoad,
  canJoin,
  currentCustomerId,
  jumpersCount: item.jumpers?.length || 0
});
```

### 3. Manifest Detection Logging

```typescript
const isUserManifested = (load: Load): boolean => {
  if (!currentCustomerId || !load.jumpers) return false;
  const manifested = load.jumpers.some(jumper =>
    jumper.id === currentCustomerId || jumper.customerId === currentCustomerId
  );
  if (manifested) {
    console.log(`User ${currentCustomerId} IS manifested on Load #${load.loadNumber}`);
  }
  return manifested;
};
```

## How It Works Now

### Manifest Detection

The app checks if a user is manifested on a load by comparing:
- `jumper.id === currentCustomerId` OR
- `jumper.customerId === currentCustomerId`

This handles both possible formats staff might use when manifesting jumpers.

### Button Logic

For each load card:

1. **Check if manifested on THIS load** (`isManifested`)
2. **Check if manifested on ANY load** (`isManifestedOnAnyLoad`)
3. **Determine if can join**:
   - `canJoin = !isManifestedOnAnyLoad || isManifested`
   - If NOT manifested anywhere → can join any load
   - If manifested on THIS load → can interact (to leave)
   - If manifested on ANOTHER load → CANNOT join this load

### Button States

| Scenario | Button Text | Button Enabled | Action |
|----------|------------|----------------|---------|
| Not manifested anywhere | "Join" | ✅ Yes | Joins the load |
| Manifested on THIS load | "Leave" | ✅ Yes | Leaves the load |
| Manifested on ANOTHER load | "Join" | ❌ No | Disabled (grayed out) |

## Real-time Updates

The app uses Firebase's `onSnapshot` listener, which means:

1. When staff manifests a jumper → Firebase sends update → App receives update instantly
2. Loads state is updated
3. Components re-render with new button states
4. User sees their manifest status immediately

## Testing

To verify the fix works:

1. Have staff manifest a jumper on Load #1
2. Check the mobile app - Load #1 should show "Leave" button
3. All other loads should show disabled "Join" buttons
4. Console logs should show:
   - User IS manifested on Load #1
   - `isManifestedOnAnyLoad: true`
   - For Load #1: `canJoin: true`, `isManifested: true`
   - For other loads: `canJoin: false`, `isManifested: false`

## Debug Scripts

Created helper scripts to diagnose manifest issues:

### Check Specific User
```bash
npx tsx scripts/check-manifest-issue.ts
```

### Find User by Name
```bash
npx tsx scripts/find-andrei.ts
```

### View All Loads
```bash
npx tsx scripts/check-all-loads-detailed.ts
```

## Key Takeaways

1. **Always include all relevant dependencies in useEffect hooks**
2. **Race conditions can occur when async data loads in different orders**
3. **Real-time listeners need to handle state changes correctly**
4. **Comprehensive logging is essential for debugging distributed state issues**
