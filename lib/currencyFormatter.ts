/**
 * Format currency amount with proper symbol and formatting
 */
export function formatCurrency(amount: number, currencyCode: string = 'AED'): string {
  return `${currencyCode} ${amount.toFixed(2)}`;
}

/**
 * Get currency symbol from currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    AED: 'AED',
    USD: '$',
    EUR: '€',
    GBP: '£',
    MVR: 'MVR',
    RON: 'RON',
  };

  return symbols[currencyCode] || currencyCode;
}

/**
 * Format currency with symbol
 */
export function formatCurrencyWithSymbol(amount: number, currencyCode: string = 'AED'): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol} ${amount.toFixed(2)}`;
}
