import axios from 'axios';
import { logger } from '../utils/logger';
import { retry } from '../utils/helpers';

export class ImageFetcher {
  private userAgent: string;

  constructor() {
    this.userAgent = process.env.USER_AGENT || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Fetch and validate image URL
   */
  async fetchImage(url: string): Promise<boolean> {
    if (!url || !url.startsWith('http')) {
      return false;
    }

    try {
      const response = await retry(
        async () => {
          return await axios.head(url, {
            headers: {
              'User-Agent': this.userAgent,
            },
            timeout: 5000,
          });
        },
        {
          maxRetries: 2,
          initialDelay: 500,
        }
      );

      const contentType = response.headers['content-type'];
      return contentType?.startsWith('image/') || false;
    } catch (error) {
      logger.debug(`Failed to validate image URL: ${url}`, error);
      return false;
    }
  }

  /**
   * Get best quality image from list of URLs
   */
  async getBestImage(imageUrls: string[]): Promise<string | undefined> {
    for (const url of imageUrls) {
      const isValid = await this.fetchImage(url);
      if (isValid) {
        return url;
      }
    }
    return undefined;
  }

  /**
   * Extract image URLs from HTML meta tags
   */
  extractMetaImages(html: string): string[] {
    const images: string[] = [];
    
    // Extract og:image
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogImageMatch) {
      images.push(ogImageMatch[1]);
    }

    // Extract twitter:image
    const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
    if (twitterImageMatch) {
      images.push(twitterImageMatch[1]);
    }

    return images;
  }
}
