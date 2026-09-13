# Standby System Implementation

## Overview

The standby system allows load times to be frozen at specific values, preventing the countdown timer from updating. This is useful when operations need to be paused or loads need to wait without showing countdown changes.

## Firebase Structure

The standby configuration is stored in Firebase at:

```
/dropzones/{dropzoneId}/system/standby
```

### Document Schema

```typescript
{
  isActive: boolean;          // Whether standby mode is active
  activatedAt: string;        // ISO timestamp when activated
  loadOffsets: [              // Array of load offsets
    {
      loadId: string;                    // Firebase document ID of the load
      minutesUntilDeparture: number;     // Frozen minutes value to display
    }
  ]
}
```

### Example

```json
{
  "isActive": true,
  "activatedAt": "2026-03-02T10:48:35.179Z",
  "loadOffsets": [
    {
      "loadId": "rOctQO4ivVM54Wh8T0In",
      "minutesUntilDeparture": 10
    },
    {
      "loadId": "nwhF6FwY4sM9kFttNmuH",
      "minutesUntilDeparture": 15
    },
    {
      "loadId": "QvkLY3EOk51qFIO1r0zC",
      "minutesUntilDeparture": 20
    }
  ]
}
```

## How It Works

### When `isActive: true` (Standby Active)

1. **Timer Stops**: The countdown timer completely stops updating
2. **Frozen Times**: Each load displays the exact `minutesUntilDeparture` value from Firebase
3. **Immune to Changes**: Adding/removing jumpers or modifying loads does NOT affect displayed times
4. **Real-time Sync**: Firebase listener ensures instant updates to frozen times

### When `isActive: false` (Normal Mode)

1. **Timer Runs**: Countdown updates every second
2. **Real-time Calculation**: Times calculated from actual `departureTime` field
3. **Dynamic Updates**: Times decrease as seconds pass

## Implementation Details

### Timer Control

```typescript
useEffect(() => {
  if (standbyState.isActive) {
    return; // Don't run timer when in standby mode
  }

  const interval = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

  return () => clearInterval(interval);
}, [standbyState.isActive]);
```

### Firebase Listener

```typescript
const standbyRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'system', 'standby');

onSnapshot(standbyRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data();

    // Convert array to object keyed by loadId
    let loadOffsetsMap = {};
    if (Array.isArray(data.loadOffsets)) {
      data.loadOffsets.forEach(offset => {
        loadOffsetsMap[offset.loadId] = {
          minutesUntilDeparture: offset.minutesUntilDeparture
        };
      });
    }

    setStandbyState({
      isActive: data.isActive || false,
      loadOffsets: loadOffsetsMap
    });
  }
});
```

### Display Logic

```typescript
let minutesUntil: number;
if (standbyState.isActive && standbyState.loadOffsets?.[item.id]) {
  // Use frozen time from Firebase
  minutesUntil = standbyState.loadOffsets[item.id].minutesUntilDeparture;
} else {
  // Calculate real-time countdown
  minutesUntil = calculateMinutesUntilDeparture(item.departureTime);
}
```

## Testing Scripts

### Activate Standby Mode

```bash
npx tsx scripts/test-standby-frozen-times.ts
```

This script will:
- Check current standby state
- Activate standby mode with frozen times
- Verify the configuration

### Deactivate Standby Mode

```bash
npx tsx scripts/deactivate-standby.ts
```

This script will:
- Set `isActive: false`
- Resume normal countdown behavior

### Verify Standby Structure

```bash
npx tsx scripts/verify-standby-structure.ts
```

This script will:
- List all loads with their IDs
- Show current standby configuration
- Verify loadOffsets match actual loads

## Key Benefits

1. **Complete Control**: Times stay exactly as set, unaffected by any system changes
2. **Real-time Updates**: Changes to standby configuration reflect immediately in UI
3. **No Side Effects**: Load modifications (adding/removing jumpers) don't affect timing
4. **Easy Toggle**: Simple boolean switch to enable/disable frozen times
5. **Load-Specific**: Each load can have its own frozen time value

## Important Notes

- The `loadOffsets` array in Firebase is automatically converted to an object keyed by `loadId` for efficient lookups
- Debug logs are included to help troubleshoot standby behavior
- The system is backward compatible - if `loadOffsets` is already an object, it uses it as-is
