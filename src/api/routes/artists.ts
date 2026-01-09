import { Router, Request, Response } from 'express';
import { db } from '../../database/client';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/artists
 * List all artists
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await db.query(
      'SELECT * FROM artists ORDER BY name ASC LIMIT $1 OFFSET $2',
      [parseInt(limit as string), parseInt(offset as string)]
    );

    res.json({
      artists: result.rows,
      total: result.rowCount,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    logger.error('Error fetching artists', error);
    res.status(500).json({ error: 'Failed to fetch artists' });
  }
});

/**
 * GET /api/artists/:id
 * Get artist details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM artists WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching artist', error);
    res.status(500).json({ error: 'Failed to fetch artist' });
  }
});

/**
 * GET /api/artists/:id/festivals
 * Get festivals for an artist
 */
router.get('/:id/festivals', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT f.* FROM festivals f
       INNER JOIN festival_artists fa ON f.id = fa.festival_id
       WHERE fa.artist_id = $1
       ORDER BY f.start_date ASC`,
      [id]
    );

    res.json({
      festivals: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    logger.error('Error fetching artist festivals', error);
    res.status(500).json({ error: 'Failed to fetch artist festivals' });
  }
});

export default router;
