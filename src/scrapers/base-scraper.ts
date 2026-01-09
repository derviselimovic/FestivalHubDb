import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { ScraperConfig, ScrapedFestival, ScraperResult } from '../types/festival.types';
import { scraperLogger as logger } from '../utils/logger';
import { retry, randomDelay, sleep } from '../utils/helpers';

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;

  constructor(config: ScraperConfig) {
    this.config = {
      userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      delay: parseInt(process.env.SCRAPE_DELAY_MS || '3000'),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      headless: true,
      ...config,
    };
  }

  /**
   * Initialize browser and context
   */
  protected async initBrowser(): Promise<void> {
    try {
      logger.info(`Initializing browser for ${this.config.source}`);
      
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      this.context = await this.browser.newContext({
        userAgent: this.config.userAgent,
        viewport: { width: 1920, height: 1080 },
      });

      logger.info(`Browser initialized for ${this.config.source}`);
    } catch (error) {
      logger.error(`Failed to initialize browser for ${this.config.source}`, error);
      throw error;
    }
  }

  /**
   * Create a new page with common settings
   */
  protected async createPage(): Promise<Page> {
    if (!this.context) {
      await this.initBrowser();
    }

    const page = await this.context!.newPage();
    
    // Block unnecessary resources for faster scraping
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    return page;
  }

  /**
   * Navigate to URL with retry logic
   */
  protected async navigateWithRetry(page: Page, url: string): Promise<void> {
    await retry(
      async () => {
        logger.debug(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          // Ignore timeout, page might be loaded enough
        });
      },
      {
        maxRetries: this.config.maxRetries,
        onRetry: (attempt, error) => {
          logger.warn(`Navigation retry ${attempt} for ${url}`, { error: error.message });
        },
      }
    );
  }

  /**
   * Wait for selector with timeout
   */
  protected async waitForSelector(page: Page, selector: string, timeout: number = 10000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      logger.debug(`Selector not found: ${selector}`);
      return false;
    }
  }

  /**
   * Extract text content from selector
   */
  protected async getTextContent(page: Page, selector: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      if (element) {
        return await element.textContent();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract attribute from selector
   */
  protected async getAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      if (element) {
        return await element.getAttribute(attribute);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get all text contents matching selector
   */
  protected async getAllTextContents(page: Page, selector: string): Promise<string[]> {
    try {
      const elements = await page.$$(selector);
      const texts: string[] = [];
      
      for (const element of elements) {
        const text = await element.textContent();
        if (text && text.trim()) {
          texts.push(text.trim());
        }
      }
      
      return texts;
    } catch {
      return [];
    }
  }

  /**
   * Close browser
   */
  protected async closeBrowser(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      logger.info(`Browser closed for ${this.config.source}`);
    } catch (error) {
      logger.error(`Error closing browser for ${this.config.source}`, error);
    }
  }

  /**
   * Add random delay between requests
   */
  protected async addDelay(): Promise<void> {
    await randomDelay(this.config.delay! * 0.8, this.config.delay! * 1.2);
  }

  /**
   * Abstract method to be implemented by specific scrapers
   */
  abstract scrape(): Promise<ScraperResult>;

  /**
   * Run the scraper with proper initialization and cleanup
   */
  public async run(): Promise<ScraperResult> {
    try {
      logger.info(`Starting scraper: ${this.config.source}`);
      await this.initBrowser();
      const result = await this.scrape();
      logger.info(`Scraper completed: ${this.config.source}`, {
        festivalsFound: result.festivals.length,
        errors: result.errors.length,
      });
      return result;
    } catch (error) {
      logger.error(`Scraper failed: ${this.config.source}`, error);
      return {
        source: this.config.source,
        festivals: [],
        errors: [(error as Error).message],
        success: false,
      };
    } finally {
      await this.closeBrowser();
    }
  }
}
