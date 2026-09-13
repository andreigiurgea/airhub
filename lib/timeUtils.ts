/**
 * Time calculation utilities
 */

/**
 * Calculate minutes until a target time string (HH:MM format)
 */
export const calculateMinutesUntilDeparture = (timeStr: string): number => {
  const match = timeStr.match(/(\d+):(\d+)/);
  if (!match) return 0;

  const [, hours, minutes] = match;
  const targetHour = parseInt(hours, 10);
  const targetMinute = parseInt(minutes, 10);

  const now = new Date();
  const targetTime = new Date();
  targetTime.setHours(targetHour, targetMinute, 0, 0);

  if (targetTime < now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  const diffMs = targetTime.getTime() - now.getTime();
  return Math.floor(diffMs / 60000);
};

/**
 * Calculate time elapsed since a timestamp
 */
export const calculateTimeSince = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

/**
 * Format timestamp to readable time
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Convert Fahrenheit to Celsius
 */
export const fahrenheitToCelsius = (fahrenheit: number): string => {
  return ((fahrenheit - 32) * 5 / 9).toFixed(1);
};
