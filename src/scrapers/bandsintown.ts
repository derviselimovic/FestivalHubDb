import { BaseScraper } from './base-scraper';
import { ScrapedFestival, ScraperResult } from '../types/festival.types';
import { scraperLogger as logger } from '../utils/logger';
import { generateFestivalId, getContinent, isDateInRange } from '../utils/helpers';

export class BandsintownScraper extends BaseScraper {
  constructor() {
    super({
      source: 'Bandsintown',
      baseUrl: 'https://www.bandsintown.com',
    });
  }

  async scrape(): Promise<ScraperResult> {
    const festivals: ScrapedFestival[] = [];
    const errors: string[] = [];

    try {
      const page = await this.createPage();
      
      // Navigate to festivals/events page
      await this.navigateWithRetry(page, `${this.config.baseUrl}/festivals`);
      await this.addDelay();

      // Wait for event cards
      const cardsLoaded = await this.waitForSelector(page, '[data-testid="event-card"], .event-card, article', 15000);
      
      if (!cardsLoaded) {
        logger.warn('Event cards not found on Bandsintown');
        return { source: this.config.source, festivals, errors: ['Event cards not found'], success: false };
      }

      // Scroll to load more events
      await this.scrollToLoadMore(page);

      // Extract festival data
      const festivalData = await page.$$eval('[data-testid="event-card"], .event-card, article', (elements) => {
        return elements.slice(0, 50).map((el) => {
          const nameEl = el.querySelector('h2, h3, [data-testid="event-name"], .event-name');
          const locationEl = el.querySelector('[data-testid="venue-name"], .venue-name, .location');
          const dateEl = el.querySelector('time, [data-testid="event-date"]');
          const linkEl = el.querySelector('a');
          const imageEl = el.querySelector('img');

          return {
            name: nameEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '',
            url: linkEl ? (linkEl as HTMLAnchorElement).href : '',
            imageUrl: imageEl ? (imageEl as HTMLImageElement).src : '',
          };
        });
      });

      logger.info(`Found ${festivalData.length} events on Bandsintown`);

      // Filter and process festivals
      for (const data of festivalData) {
        try {
          // Skip if no name or if it's clearly not a festival
          if (!data.name || data.name.length < 3) continue;

          // Simple heuristic: festivals usually have "festival", "fest", or "fest" in the name
          const isFestival = /festival|fest|weekend|gathering/i.test(data.name);
          if (!isFestival) continue;

          const festival: ScrapedFestival = {
            name: data.name,
            location: data.location || undefined,
            country: this.extractCountryFromLocation(data.location),
            startDate: this.parseDate(data.date),
            imageUrl: data.imageUrl || undefined,
            ticketUrl: data.url || undefined,
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
          const errorMsg = `Failed to process event ${data.name}: ${(error as Error).message}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      await page.close();
    } catch (error) {
      logger.error('Bandsintown scraper error', error);
      errors.push((error as Error).message);
    }

    return {
      source: this.config.source,
      festivals,
      errors,
      success: festivals.length > 0,
    };
  }

  private async scrollToLoadMore(page: any): Promise<void> {
    try {
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
      }
    } catch (error) {
      logger.debug('Error scrolling page', error);
    }
  }

  private parseDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;

    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      logger.debug(`Error parsing date: ${dateStr}`, error);
    }

    return undefined;
  }

  private extractCountryFromLocation(location?: string): string | undefined {
    if (!location) return undefined;
    
    const parts = location.split(',').map(p => p.trim());
    return parts[parts.length - 1];
  }
}
