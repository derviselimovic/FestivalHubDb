import { BaseScraper } from './base-scraper';
import { ScrapedFestival, ScraperResult } from '../types/festival.types';
import { scraperLogger as logger } from '../utils/logger';
import { generateFestivalId, getContinent, isDateInRange } from '../utils/helpers';
import { Page } from 'playwright';

export class SongkickScraper extends BaseScraper {
  constructor() {
    super({
      source: 'Songkick',
      baseUrl: 'https://www.songkick.com',
    });
  }

  async scrape(): Promise<ScraperResult> {
    const festivals: ScrapedFestival[] = [];
    const errors: string[] = [];

    try {
      const page = await this.createPage();
      
      // Navigate to festivals page
      await this.navigateWithRetry(page, `${this.config.baseUrl}/festivals`);
      await this.addDelay();

      // Scroll to trigger lazy-loaded content
      await this.scrollToLoadMore(page);

      // Wait for festival listings - try multiple selectors to handle site redesigns
      const listingsLoaded = await this.waitForSelector(
        page,
        '.event-listing, [data-testid="event-listing"], li.festival, ol.event-listings li',
        15000
      );
      
      if (!listingsLoaded) {
        const pageTitle = await page.title().catch(() => 'unknown');
        const pageUrl = page.url();
        logger.warn(`Festival listings not found on Songkick. Page title: "${pageTitle}", URL: ${pageUrl}`);
        return { source: this.config.source, festivals, errors: ['Festival listings not found'], success: false };
      }

      // Extract festival information from listings
      // Songkick uses 'a.summary' as the main event link with festival name
      const festivalData = await page.$$eval(
        '.event-listing, li[class*="event"], ol.event-listings li',
        (elements) => {
          return elements.slice(0, 50).map((el) => {
            // Songkick uses <a class="summary"> as the primary event link
            const nameEl = el.querySelector('a.summary, strong a, .event-link, a[class*="event-name"]');
            const locationEl = el.querySelector('.location, .location-summary, [class*="location"]');
            const dateEl = el.querySelector('time, .date, [class*="date"]');
            // Use a.summary as the festival link if available, otherwise fall back to href-based selection
            const linkEl = el.querySelector('a.summary, a[href*="/festivals/"]');

            return {
              name: nameEl?.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '',
              url: linkEl ? (linkEl as HTMLAnchorElement).href : '',
            };
          });
        }
      );

      logger.info(`Found ${festivalData.length} festivals on Songkick`);

      // Process each festival
      for (const data of festivalData) {
        try {
          if (!data.name || !data.url) continue;

          const festival: ScrapedFestival = {
            name: data.name,
            location: data.location || undefined,
            country: this.extractCountryFromLocation(data.location),
            startDate: this.parseDate(data.date),
            ticketUrl: data.url,
            tags: ['Music'],
          };

          if (festival.country) {
            festival.continent = getContinent(festival.country);
          }

          if (isDateInRange(festival.startDate)) {
            festivals.push(festival);
            logger.info(`Scraped festival: ${festival.name}`);
          }
        } catch (error) {
          const errorMsg = `Failed to process festival ${data.name}: ${(error as Error).message}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      await page.close();
    } catch (error) {
      logger.error('Songkick scraper error', error);
      errors.push((error as Error).message);
    }

    return {
      source: this.config.source,
      festivals,
      errors,
      success: festivals.length > 0,
    };
  }

  private parseDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;

    try {
      // Try to parse ISO date first
      if (dateStr.includes('T') || dateStr.includes('-')) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      // Try to parse format like "Mon 15 Jun 2026"
      const match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
      if (match) {
        const [, day, month, year] = match;
        const monthNum = this.getMonthNumber(month);
        return `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (error) {
      logger.debug(`Error parsing date: ${dateStr}`, error);
    }

    return undefined;
  }

  private getMonthNumber(month: string): number {
    const months: { [key: string]: number } = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    return months[month.toLowerCase().slice(0, 3)] || 1;
  }

  private async scrollToLoadMore(page: Page): Promise<void> {
    try {
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
      }
    } catch (error) {
      logger.debug('Error scrolling page', error);
    }
  }

  private extractCountryFromLocation(location?: string): string | undefined {
    if (!location) return undefined;
    
    const parts = location.split(',').map(p => p.trim());
    return parts[parts.length - 1];
  }
}
