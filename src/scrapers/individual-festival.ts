import { BaseScraper } from './base-scraper';
import { ScrapedFestival, ScraperResult } from '../types/festival.types';
import { scraperLogger as logger } from '../utils/logger';

/**
 * Individual Festival Website Scraper
 * This scraper is used as a fallback to scrape official festival websites
 * for more detailed information when aggregator data is incomplete
 */
export class IndividualFestivalScraper extends BaseScraper {
  private festivalUrl: string;

  constructor(festivalUrl: string) {
    super({
      source: 'IndividualFestival',
      baseUrl: festivalUrl,
    });
    this.festivalUrl = festivalUrl;
  }

  async scrape(): Promise<ScraperResult> {
    const festivals: ScrapedFestival[] = [];
    const errors: string[] = [];

    try {
      const festival = await this.scrapeFestivalWebsite();
      if (festival) {
        festivals.push(festival);
      }
    } catch (error) {
      logger.error(`Individual festival scraper error for ${this.festivalUrl}`, error);
      errors.push((error as Error).message);
    }

    return {
      source: this.config.source,
      festivals,
      errors,
      success: festivals.length > 0,
    };
  }

  private async scrapeFestivalWebsite(): Promise<ScrapedFestival | null> {
    const page = await this.createPage();

    try {
      await this.navigateWithRetry(page, this.festivalUrl);

      // Try to extract common information
      const name = await this.extractName(page);
      if (!name) {
        logger.warn(`Could not extract festival name from ${this.festivalUrl}`);
        return null;
      }

      const description = await this.extractDescription(page);
      const imageUrl = await this.extractImage(page);
      const dates = await this.extractDates(page);
      const location = await this.extractLocation(page);
      const ticketUrl = await this.extractTicketUrl(page);
      const artists = await this.extractArtists(page);

      return {
        name,
        description,
        imageUrl,
        startDate: dates.start,
        endDate: dates.end,
        location,
        ticketUrl: ticketUrl || this.festivalUrl,
        officialWebsite: this.festivalUrl,
        artists: artists.slice(0, 30),
        tags: ['Music'],
      };
    } catch (error) {
      logger.error(`Error scraping individual festival ${this.festivalUrl}`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  private async extractName(page: any): Promise<string | null> {
    const selectors = [
      'h1',
      '[class*="festival-name"]',
      '[class*="title"]',
      'meta[property="og:title"]',
    ];

    for (const selector of selectors) {
      const name = selector.includes('meta')
        ? await this.getAttribute(page, selector, 'content')
        : await this.getTextContent(page, selector);
      
      if (name && name.trim().length > 0) {
        return name.trim();
      }
    }

    return null;
  }

  private async extractDescription(page: any): Promise<string | undefined> {
    const selectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      '[class*="description"]',
      '[class*="about"]',
    ];

    for (const selector of selectors) {
      const description = selector.includes('meta')
        ? await this.getAttribute(page, selector, 'content')
        : await this.getTextContent(page, selector);
      
      if (description && description.trim().length > 20) {
        return description.trim().slice(0, 1000);
      }
    }

    return undefined;
  }

  private async extractImage(page: any): Promise<string | undefined> {
    const selectors = [
      'meta[property="og:image"]',
      '[class*="hero"] img',
      '[class*="banner"] img',
      'img[class*="poster"]',
    ];

    for (const selector of selectors) {
      const imageUrl = selector.includes('meta')
        ? await this.getAttribute(page, selector, 'content')
        : await this.getAttribute(page, selector, 'src');
      
      if (imageUrl && imageUrl.startsWith('http')) {
        return imageUrl;
      }
    }

    return undefined;
  }

  private async extractDates(page: any): Promise<{ start?: string; end?: string }> {
    const selectors = [
      'time[datetime]',
      '[class*="date"]',
      '[class*="when"]',
    ];

    for (const selector of selectors) {
      if (selector.includes('time')) {
        const datetime = await this.getAttribute(page, selector, 'datetime');
        if (datetime) {
          return { start: datetime };
        }
      }
      
      const dateText = await this.getTextContent(page, selector);
      if (dateText && dateText.match(/\d{4}/)) {
        // Found a date-like text
        return { start: dateText };
      }
    }

    return {};
  }

  private async extractLocation(page: any): Promise<string | undefined> {
    const selectors = [
      '[class*="location"]',
      '[class*="venue"]',
      '[class*="where"]',
      'meta[property="og:locality"]',
    ];

    for (const selector of selectors) {
      const location = selector.includes('meta')
        ? await this.getAttribute(page, selector, 'content')
        : await this.getTextContent(page, selector);
      
      if (location && location.trim().length > 0) {
        return location.trim();
      }
    }

    return undefined;
  }

  private async extractTicketUrl(page: any): Promise<string | undefined> {
    const selectors = [
      'a[href*="ticket"]',
      'a[href*="buy"]',
      'a[class*="ticket"]',
      'a[class*="buy"]',
    ];

    for (const selector of selectors) {
      const url = await this.getAttribute(page, selector, 'href');
      if (url && url.startsWith('http')) {
        return url;
      }
    }

    return undefined;
  }

  private async extractArtists(page: any): Promise<string[]> {
    const selectors = [
      '[class*="lineup"] [class*="artist"]',
      '[class*="artist"] [class*="name"]',
      '.lineup li',
    ];

    for (const selector of selectors) {
      const artists = await this.getAllTextContents(page, selector);
      if (artists.length > 0) {
        return artists;
      }
    }

    return [];
  }
}
