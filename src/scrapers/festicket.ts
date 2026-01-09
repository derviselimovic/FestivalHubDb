import { BaseScraper } from './base-scraper';
import { ScrapedFestival, ScraperResult } from '../types/festival.types';
import { scraperLogger as logger } from '../utils/logger';
import { generateFestivalId, getContinent, isDateInRange } from '../utils/helpers';
import { Page } from 'playwright';

export class FesticketScraper extends BaseScraper {
  constructor() {
    super({
      source: 'Festicket',
      baseUrl: 'https://www.festicket.com',
    });
  }

  async scrape(): Promise<ScraperResult> {
    const festivals: ScrapedFestival[] = [];
    const errors: string[] = [];

    try {
      const page = await this.createPage();
      
      // Navigate to festivals page
      await this.navigateWithRetry(page, `${this.config.baseUrl}/festivals/`);
      await this.addDelay();

      // Wait for festival cards to load
      const cardsLoaded = await this.waitForSelector(page, '[data-testid="festival-card"], .festival-card, article', 15000);
      
      if (!cardsLoaded) {
        logger.warn('Festival cards not found on Festicket');
        return { source: this.config.source, festivals, errors: ['Festival cards not found'], success: false };
      }

      // Scroll to load more festivals
      await this.scrollToLoadMore(page);
      
      // Extract festival links
      const festivalLinks = await this.extractFestivalLinks(page);
      logger.info(`Found ${festivalLinks.length} festival links on Festicket`);

      // Scrape each festival (limit to prevent excessive scraping)
      const maxFestivals = 50;
      for (let i = 0; i < Math.min(festivalLinks.length, maxFestivals); i++) {
        try {
          const festival = await this.scrapeFestivalDetails(festivalLinks[i]);
          if (festival && isDateInRange(festival.startDate)) {
            festivals.push(festival);
            logger.info(`Scraped festival: ${festival.name}`);
          }
          await this.addDelay();
        } catch (error) {
          const errorMsg = `Failed to scrape festival ${festivalLinks[i]}: ${(error as Error).message}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      await page.close();
    } catch (error) {
      logger.error('Festicket scraper error', error);
      errors.push((error as Error).message);
    }

    return {
      source: this.config.source,
      festivals,
      errors,
      success: festivals.length > 0,
    };
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

  private async extractFestivalLinks(page: Page): Promise<string[]> {
    const links = await page.$$eval('a[href*="/festival/"]', (elements) =>
      elements.map((el) => (el as HTMLAnchorElement).href)
    );
    
    // Remove duplicates and filter valid links
    const uniqueLinks = [...new Set(links)].filter(link => 
      link.includes('/festival/') && !link.includes('#')
    );
    
    return uniqueLinks;
  }

  private async scrapeFestivalDetails(url: string): Promise<ScrapedFestival | null> {
    const page = await this.createPage();
    
    try {
      await this.navigateWithRetry(page, url);
      
      // Extract festival information
      const name = await this.getTextContent(page, 'h1, [data-testid="festival-name"]') || '';
      if (!name) {
        logger.debug(`No name found for ${url}`);
        return null;
      }

      const location = await this.extractLocation(page);
      const dates = await this.extractDates(page);
      const description = await this.extractDescription(page);
      const imageUrl = await this.getAttribute(page, 'meta[property="og:image"]', 'content');
      const ticketUrl = url; // Festicket itself is the ticket URL
      
      // Extract genres/tags
      const tags = await this.getAllTextContents(page, '.genre-tag, [data-testid="genre"], .tag');
      
      // Extract lineup (if available)
      const artists = await this.getAllTextContents(page, '.lineup-artist, [data-testid="artist-name"], .artist-name');

      const country = this.extractCountryFromLocation(location);

      return {
        name: name.trim(),
        location,
        country,
        continent: getContinent(country),
        startDate: dates.start,
        endDate: dates.end,
        description,
        imageUrl: imageUrl || undefined,
        ticketUrl,
        officialWebsite: await this.extractOfficialWebsite(page),
        tags: tags.length > 0 ? tags : ['Music'],
        artists: artists.slice(0, 20), // Limit artists
      };
    } catch (error) {
      logger.error(`Error scraping festival details from ${url}`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  private async extractLocation(page: Page): Promise<string | undefined> {
    const selectors = [
      '[data-testid="festival-location"]',
      '.location',
      '.festival-location',
      'meta[property="og:locality"]',
    ];

    for (const selector of selectors) {
      const location = selector.includes('meta')
        ? await this.getAttribute(page, selector, 'content')
        : await this.getTextContent(page, selector);
      
      if (location) return location.trim();
    }

    return undefined;
  }

  private async extractDates(page: Page): Promise<{ start?: string; end?: string }> {
    const dateSelectors = [
      '[data-testid="festival-dates"]',
      '.dates',
      '.festival-dates',
      'time[datetime]',
    ];

    for (const selector of dateSelectors) {
      if (selector.includes('time')) {
        const dateTime = await this.getAttribute(page, selector, 'datetime');
        if (dateTime) {
          return { start: dateTime };
        }
      } else {
        const dateText = await this.getTextContent(page, selector);
        if (dateText) {
          const dates = this.parseDateRange(dateText);
          if (dates.start) return dates;
        }
      }
    }

    return {};
  }

  private parseDateRange(dateText: string): { start?: string; end?: string } {
    // Simple date parsing - can be enhanced
    const year = new Date().getFullYear();
    const nextYear = year + 1;
    
    // Look for patterns like "June 15-17, 2026" or "15-17 June 2026"
    const match = dateText.match(/(\d{1,2})[^\d]*(\d{1,2})?[^\d]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^\d]*(\d{4})/i);
    
    if (match) {
      const [, day1, day2, month, yearMatch] = match;
      const monthNum = this.getMonthNumber(month);
      const startDate = `${yearMatch}-${monthNum.toString().padStart(2, '0')}-${day1.padStart(2, '0')}`;
      const endDate = day2 ? `${yearMatch}-${monthNum.toString().padStart(2, '0')}-${day2.padStart(2, '0')}` : startDate;
      
      return { start: startDate, end: endDate };
    }

    return {};
  }

  private getMonthNumber(month: string): number {
    const months: { [key: string]: number } = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    return months[month.toLowerCase().slice(0, 3)] || 1;
  }

  private async extractDescription(page: Page): Promise<string | undefined> {
    const description = await this.getTextContent(page, 
      '[data-testid="festival-description"], .description, .festival-description, meta[name="description"]'
    );
    return description?.trim();
  }

  private async extractOfficialWebsite(page: Page): Promise<string | undefined> {
    const website = await this.getAttribute(page, 'a[href*="official"], a[rel="external"]', 'href');
    return website || undefined;
  }

  private extractCountryFromLocation(location?: string): string | undefined {
    if (!location) return undefined;
    
    // Simple country extraction from location string
    const parts = location.split(',').map(p => p.trim());
    return parts[parts.length - 1];
  }
}
