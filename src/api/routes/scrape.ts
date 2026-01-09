import { Router, Request, Response } from 'express';
import { db } from '../../database/client';
import { logger } from '../../utils/logger';
import { FesticketScraper } from '../../scrapers/festicket';
import { SongkickScraper } from '../../scrapers/songkick';
import { BandsintownScraper } from '../../scrapers/bandsintown';
import { ScraperResult } from '../../types/festival.types';
import { saveFestivals } from '../../database/save-festivals';

const router = Router();

// Store active scrape jobs
const activeJobs = new Map<string, { status: string; progress: number; startTime: Date }>();

/**
 * POST /api/scrape/trigger
 * Manually trigger a scrape
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { source = 'all' } = req.body;
    const jobId = `${source}-${Date.now()}`;

    activeJobs.set(jobId, {
      status: 'running',
      progress: 0,
      startTime: new Date(),
    });

    // Run scraper asynchronously
    runScraper(source, jobId).catch(error => {
      logger.error('Scraper job failed', { jobId, error });
    });

    res.json({
      message: 'Scrape job started',
      jobId,
      source,
    });
  } catch (error) {
    logger.error('Error triggering scrape', error);
    res.status(500).json({ error: 'Failed to trigger scrape' });
  }
});

/**
 * GET /api/scrape/status
 * Get scrape job status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.query;

    if (jobId) {
      const job = activeJobs.get(jobId as string);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      return res.json({ jobId, ...job });
    }

    // Return all active jobs
    const jobs = Array.from(activeJobs.entries()).map(([id, job]) => ({
      jobId: id,
      ...job,
    }));

    res.json({ jobs });
  } catch (error) {
    logger.error('Error fetching scrape status', error);
    res.status(500).json({ error: 'Failed to fetch scrape status' });
  }
});

/**
 * GET /api/scrape/logs
 * Get scrape logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, source } = req.query;

    let query = 'SELECT * FROM scrape_logs';
    const params: any[] = [];

    if (source) {
      query += ' WHERE source = $1';
      params.push(source);
    }

    query += ' ORDER BY started_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await db.query(query, params);

    res.json({
      logs: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    logger.error('Error fetching scrape logs', error);
    res.status(500).json({ error: 'Failed to fetch scrape logs' });
  }
});

/**
 * Run scraper and save results
 */
async function runScraper(source: string, jobId: string): Promise<void> {
  const logId = await createScrapeLog(source);
  
  try {
    let results: ScraperResult[] = [];

    if (source === 'all') {
      const scrapers = [
        new FesticketScraper(),
        new SongkickScraper(),
        new BandsintownScraper(),
      ];

      for (const scraper of scrapers) {
        const result = await scraper.run();
        results.push(result);
        updateJobProgress(jobId, 33 * results.length);
      }
    } else {
      let scraper;
      switch (source) {
        case 'festicket':
          scraper = new FesticketScraper();
          break;
        case 'songkick':
          scraper = new SongkickScraper();
          break;
        case 'bandsintown':
          scraper = new BandsintownScraper();
          break;
        default:
          throw new Error(`Unknown source: ${source}`);
      }

      const result = await scraper.run();
      results.push(result);
      updateJobProgress(jobId, 50);
    }

    // Save all festivals
    let totalSaved = 0;
    let totalFound = 0;

    for (const result of results) {
      totalFound += result.festivals.length;
      const saved = await saveFestivals(result.festivals);
      totalSaved += saved;
    }

    updateJobProgress(jobId, 100);
    await completeScrapeLog(logId, totalFound, totalSaved, null);
    
    activeJobs.set(jobId, {
      status: 'completed',
      progress: 100,
      startTime: activeJobs.get(jobId)!.startTime,
    });

    logger.info('Scrape job completed', { jobId, totalFound, totalSaved });
  } catch (error) {
    logger.error('Scrape job failed', { jobId, error });
    await completeScrapeLog(logId, 0, 0, (error as Error).message);
    
    activeJobs.set(jobId, {
      status: 'failed',
      progress: 0,
      startTime: activeJobs.get(jobId)!.startTime,
    });
  }
}

async function createScrapeLog(source: string): Promise<number> {
  const result = await db.query(
    'INSERT INTO scrape_logs (source, status, started_at) VALUES ($1, $2, $3) RETURNING id',
    [source, 'started', new Date()]
  );
  return result.rows[0].id;
}

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

function updateJobProgress(jobId: string, progress: number): void {
  const job = activeJobs.get(jobId);
  if (job) {
    job.progress = progress;
    activeJobs.set(jobId, job);
  }
}

export default router;
