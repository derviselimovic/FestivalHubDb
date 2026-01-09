import cron from 'node-cron';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { FesticketScraper } from '../scrapers/festicket';
import { SongkickScraper } from '../scrapers/songkick';
import { BandsintownScraper } from '../scrapers/bandsintown';
import { saveFestivals } from '../database/save-festivals';
import { db } from '../database/client';

// Load environment variables
dotenv.config();

const ENABLE_SCHEDULER = process.env.ENABLE_SCHEDULER === 'true';
const SCRAPE_CRON = process.env.SCRAPE_CRON || '0 2 * * 1'; // Default: Every Monday at 2 AM

/**
 * Main scraping job
 */
async function runScrapingJob(): Promise<void> {
  logger.info('Starting scheduled scraping job...');
  
  const logId = await createScrapeLog('scheduled');

  try {
    const scrapers = [
      new FesticketScraper(),
      new SongkickScraper(),
      new BandsintownScraper(),
    ];

    let totalFestivals = 0;
    let totalSaved = 0;

    for (const scraper of scrapers) {
      try {
        logger.info(`Running ${scraper.constructor.name}...`);
        const result = await scraper.run();
        
        logger.info(`${scraper.constructor.name} completed`, {
          found: result.festivals.length,
          errors: result.errors.length,
        });

        if (result.festivals.length > 0) {
          const saved = await saveFestivals(result.festivals);
          totalFestivals += result.festivals.length;
          totalSaved += saved;
        }
      } catch (error) {
        logger.error(`Scraper ${scraper.constructor.name} failed`, error);
      }
    }

    await completeScrapeLog(logId, totalFestivals, totalSaved, null);
    logger.info('Scheduled scraping job completed', { totalFestivals, totalSaved });
  } catch (error) {
    logger.error('Scheduled scraping job failed', error);
    await completeScrapeLog(logId, 0, 0, (error as Error).message);
  }
}

/**
 * Data cleanup job - remove old festivals
 */
async function runCleanupJob(): Promise<void> {
  logger.info('Starting data cleanup job...');

  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await db.query(
      'DELETE FROM festivals WHERE end_date < $1',
      [threeMonthsAgo.toISOString().split('T')[0]]
    );

    logger.info(`Cleanup job completed - removed ${result.rowCount} old festivals`);
  } catch (error) {
    logger.error('Cleanup job failed', error);
  }
}

/**
 * Create scrape log entry
 */
async function createScrapeLog(source: string): Promise<number> {
  const result = await db.query(
    'INSERT INTO scrape_logs (source, status, started_at) VALUES ($1, $2, $3) RETURNING id',
    [source, 'started', new Date()]
  );
  return result.rows[0].id;
}

/**
 * Complete scrape log entry
 */
async function completeScrapeLog(
  logId: number,
  festivalsFound: number,
  festivalsSaved: number,
  error: string | null
): Promise<void> {
  await db.query(
    `UPDATE scrape_logs 
     SET status = $1, festivals_found = $2, festivals_saved = $3, error_message = $4, completed_at = $5
     WHERE id = $6`,
    [error ? 'failed' : 'completed', festivalsFound, festivalsSaved, error, new Date(), logId]
  );
}

/**
 * Initialize and start scheduled jobs
 */
async function startScheduler(): Promise<void> {
  if (!ENABLE_SCHEDULER) {
    logger.info('Scheduler is disabled');
    return;
  }

  logger.info(`Starting job scheduler with cron: ${SCRAPE_CRON}`);

  // Test database connection
  const dbConnected = await db.testConnection();
  if (!dbConnected) {
    logger.error('Failed to connect to database');
    process.exit(1);
  }

  // Weekly scraping job
  cron.schedule(SCRAPE_CRON, async () => {
    logger.info('Cron job triggered: Weekly scraping');
    await runScrapingJob();
  });

  // Daily cleanup job (at 3 AM)
  cron.schedule('0 3 * * *', async () => {
    logger.info('Cron job triggered: Daily cleanup');
    await runCleanupJob();
  });

  logger.info('Job scheduler started successfully');
  logger.info('Scheduled jobs:');
  logger.info(`- Weekly scraping: ${SCRAPE_CRON}`);
  logger.info('- Daily cleanup: 0 3 * * *');
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down scheduler');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down scheduler');
  await db.close();
  process.exit(0);
});

// Start the scheduler
startScheduler().catch((error) => {
  logger.error('Failed to start scheduler', error);
  process.exit(1);
});
