import axios from 'axios';
import { SpotifyArtistInfo } from '../types/festival.types';
import { logger } from '../utils/logger';
import { retry } from '../utils/helpers';

export class ArtistEnricher {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      logger.warn('Spotify credentials not configured. Artist enrichment will be limited.');
    }
  }

  /**
   * Get Spotify access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry

      logger.info('Spotify access token obtained');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get Spotify access token', error);
      throw error;
    }
  }

  /**
   * Search for artist on Spotify
   */
  async searchArtist(artistName: string): Promise<SpotifyArtistInfo | null> {
    if (!this.clientId || !this.clientSecret) {
      logger.debug('Spotify credentials not configured, skipping artist search');
      return null;
    }

    try {
      const token = await this.getAccessToken();

      const response = await retry(
        async () => {
          return await axios.get('https://api.spotify.com/v1/search', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              q: artistName,
              type: 'artist',
              limit: 1,
            },
          });
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Spotify search retry ${attempt} for ${artistName}`, { error: error.message });
          },
        }
      );

      const artists = response.data.artists?.items || [];
      if (artists.length === 0) {
        logger.debug(`No Spotify artist found for: ${artistName}`);
        return null;
      }

      const artist = artists[0];
      const imageUrl = artist.images && artist.images.length > 0 ? artist.images[0].url : undefined;

      return {
        name: artist.name,
        imageUrl,
        spotifyUrl: artist.external_urls?.spotify,
      };
    } catch (error) {
      logger.error(`Error searching Spotify for artist: ${artistName}`, error);
      return null;
    }
  }

  /**
   * Enrich multiple artists
   */
  async enrichArtists(artistNames: string[]): Promise<Map<string, SpotifyArtistInfo>> {
    const enrichedArtists = new Map<string, SpotifyArtistInfo>();

    if (!this.clientId || !this.clientSecret) {
      logger.debug('Spotify credentials not configured, skipping artist enrichment');
      return enrichedArtists;
    }

    logger.info(`Enriching ${artistNames.length} artists with Spotify data`);

    for (const artistName of artistNames) {
      try {
        const artistInfo = await this.searchArtist(artistName);
        if (artistInfo) {
          enrichedArtists.set(artistName, artistInfo);
        }
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to enrich artist: ${artistName}`, error);
      }
    }

    logger.info(`Successfully enriched ${enrichedArtists.size} artists`);
    return enrichedArtists;
  }

  /**
   * Search for social media profiles (simplified implementation)
   */
  async searchSocialMedia(artistName: string): Promise<{
    instagram?: string;
    twitter?: string;
    website?: string;
  }> {
    // This is a simplified implementation
    // In a production environment, you would use actual APIs or web scraping
    const normalized = artistName.toLowerCase().replace(/\s+/g, '');
    
    return {
      instagram: `https://instagram.com/${normalized}`,
      twitter: `https://twitter.com/${normalized}`,
    };
  }
}
