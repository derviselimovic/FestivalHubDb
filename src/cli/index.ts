import { Command } from 'commander';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { FesticketScraper } from '../scrapers/festicket';
import { SongkickScraper } from '../scrapers/songkick';
import { BandsintownScraper } from '../scrapers/bandsintown';
import { runMigrations, resetDatabase, seedDatabase } from '../database/migrations';
import { saveFestivals } from '../database/save-festivals';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('festival-scraper')
  .description('Festival data scraping and management CLI')
  .version('1.0.0');

// Scrape commands
const scrapeCommand = program.command('scrape').description('Scrape festival data from various sources');

scrapeCommand
  .command('all')
  .description('Scrape all sources')
  .action(async () => {
    try {
      logger.info('Starting scrape from all sources...');
      
      const scrapers = [
        new FesticketScraper(),
        new SongkickScraper(),
        new BandsintownScraper(),
      ];

      let totalFestivals = 0;
      let totalSaved = 0;

      for (const scraper of scrapers) {
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
      }

      logger.info('All scrapers completed', {
        totalFestivals,
        totalSaved,
      });
      
      process.exit(0);
    } catch (error) {
      logger.error('Scrape failed', error);
      process.exit(1);
    }
  });

scrapeCommand
  .command('festicket')
  .description('Scrape Festicket only')
  .action(async () => {
    await runSingleScraper(new FesticketScraper());
  });

scrapeCommand
  .command('songkick')
  .description('Scrape Songkick only')
  .action(async () => {
    await runSingleScraper(new SongkickScraper());
  });

scrapeCommand
  .command('bandsintown')
  .description('Scrape Bandsintown only')
  .action(async () => {
    await runSingleScraper(new BandsintownScraper());
  });

// Database commands
const dbCommand = program.command('db').description('Database management commands');

dbCommand
  .command('migrate')
  .description('Run database migrations')
  .action(async () => {
    try {
      logger.info('Running database migrations...');
      await runMigrations();
      logger.info('Migrations completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Migration failed', error);
      process.exit(1);
    }
  });

dbCommand
  .command('seed')
  .description('Seed database with test data')
  .action(async () => {
    try {
      logger.info('Seeding database...');
      await seedDatabase();
      logger.info('Database seeded successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Seeding failed', error);
      process.exit(1);
    }
  });

dbCommand
  .command('reset')
  .description('Reset database (WARNING: destroys all data)')
  .action(async () => {
    try {
      logger.warn('Resetting database - all data will be lost!');
      await resetDatabase();
      logger.info('Database reset successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Reset failed', error);
      process.exit(1);
    }
  });

// Helper function to run a single scraper
async function runSingleScraper(scraper: any): Promise<void> {
  try {
    logger.info(`Starting ${scraper.constructor.name}...`);
    const result = await scraper.run();
    
    logger.info(`${scraper.constructor.name} completed`, {
      found: result.festivals.length,
      errors: result.errors.length,
    });

    if (result.festivals.length > 0) {
      const saved = await saveFestivals(result.festivals);
      logger.info(`Saved ${saved} out of ${result.festivals.length} festivals`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Scraper failed', error);
    process.exit(1);
  }
}

program.parse();
