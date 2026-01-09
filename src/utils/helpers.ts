import { logger } from './logger';

/**
 * Sleep for a specified number of milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      logger.warn(`Retry attempt ${attempt}/${maxRetries} after error`, {
        error: lastError.message,
        delay,
      });

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Generate a unique festival ID from name and location
 */
export function generateFestivalId(name: string, location?: string): string {
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  if (location) {
    const normalizedLocation = location
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${normalizedName}-${normalizedLocation}`;
  }
  
  return normalizedName;
}

/**
 * Normalize country name to continent
 */
export function getContinent(country?: string): string | undefined {
  if (!country) return undefined;

  const continentMap: { [key: string]: string } = {
    // Europe
    'united kingdom': 'Europe',
    'uk': 'Europe',
    'germany': 'Europe',
    'france': 'Europe',
    'spain': 'Europe',
    'italy': 'Europe',
    'netherlands': 'Europe',
    'belgium': 'Europe',
    'portugal': 'Europe',
    'poland': 'Europe',
    'czech republic': 'Europe',
    'austria': 'Europe',
    'switzerland': 'Europe',
    'sweden': 'Europe',
    'norway': 'Europe',
    'denmark': 'Europe',
    'finland': 'Europe',
    'ireland': 'Europe',
    'croatia': 'Europe',
    'greece': 'Europe',
    'serbia': 'Europe',
    'hungary': 'Europe',
    'romania': 'Europe',
    
    // North America
    'united states': 'North America',
    'usa': 'North America',
    'canada': 'North America',
    'mexico': 'North America',
    
    // South America
    'brazil': 'South America',
    'argentina': 'South America',
    'chile': 'South America',
    'colombia': 'South America',
    'peru': 'South America',
    
    // Asia
    'japan': 'Asia',
    'china': 'Asia',
    'india': 'Asia',
    'south korea': 'Asia',
    'thailand': 'Asia',
    'singapore': 'Asia',
    'indonesia': 'Asia',
    
    // Oceania
    'australia': 'Oceania',
    'new zealand': 'Oceania',
    
    // Africa
    'south africa': 'Africa',
    'egypt': 'Africa',
    'morocco': 'Africa',
  };

  const normalizedCountry = country.toLowerCase().trim();
  return continentMap[normalizedCountry] || undefined;
}

/**
 * Validate and parse date string
 */
export function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    return date;
  } catch {
    return undefined;
  }
}

/**
 * Check if a date is within the target range (1 year from now)
 */
export function isDateInRange(date: Date | string | undefined): boolean {
  if (!date) return false;
  
  const festivalDate = typeof date === 'string' ? parseDate(date) : date;
  if (!festivalDate) return false;
  
  const now = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  
  return festivalDate >= now && festivalDate <= oneYearFromNow;
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract price range from multiple prices
 */
export function getPriceRange(prices: string[]): string | undefined {
  if (prices.length === 0) return undefined;
  if (prices.length === 1) return prices[0];
  
  // Sort and return range
  const sortedPrices = prices.sort();
  return `${sortedPrices[0]} - ${sortedPrices[sortedPrices.length - 1]}`;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Random delay between min and max milliseconds
 */
export async function randomDelay(min: number = 2000, max: number = 5000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(delay);
}
