import { Router, Request, Response } from 'express';
import { db } from '../../database/client';
import { logger } from '../../utils/logger';
import { FestivalResponse, ArtistDetail, FestivalFactsResponse } from '../../types/festival.types';

const router = Router();

/**
 * GET /api/festivals
 * List all festivals with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { country, continent, tag, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT DISTINCT f.*
      FROM festivals f
      LEFT JOIN festival_tags ft ON f.id = ft.festival_id
      LEFT JOIN tags t ON ft.tag_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (country) {
      query += ` AND f.country ILIKE $${paramIndex}`;
      params.push(`%${country}%`);
      paramIndex++;
    }

    if (continent) {
      query += ` AND f.continent ILIKE $${paramIndex}`;
      params.push(`%${continent}%`);
      paramIndex++;
    }

    if (tag) {
      query += ` AND t.name ILIKE $${paramIndex}`;
      params.push(`%${tag}%`);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND f.start_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND f.end_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY f.start_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await db.query(query, params);

    const festivals = await Promise.all(
      result.rows.map(async (festival) => await formatFestivalResponse(festival))
    );

    res.json({
      festivals,
      total: result.rowCount,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    logger.error('Error fetching festivals', error);
    res.status(500).json({ error: 'Failed to fetch festivals' });
  }
});

/**
 * GET /api/festivals/:id
 * Get festival by ID (full JSON format)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM festivals WHERE festival_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Festival not found' });
    }

    const festival = await formatFestivalResponse(result.rows[0]);
    res.json(festival);
  } catch (error) {
    logger.error('Error fetching festival', error);
    res.status(500).json({ error: 'Failed to fetch festival' });
  }
});

/**
 * POST /api/festivals
 * Create a new festival (admin)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { festival_id, name, location, country, continent, start_date, end_date, description, image_url, ticket_url } = req.body;

    if (!festival_id || !name) {
      return res.status(400).json({ error: 'festival_id and name are required' });
    }

    const result = await db.query(
      `INSERT INTO festivals (festival_id, name, location, country, continent, start_date, end_date, description, image_url, ticket_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [festival_id, name, location, country, continent, start_date, end_date, description, image_url, ticket_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating festival', error);
    res.status(500).json({ error: 'Failed to create festival' });
  }
});

/**
 * PUT /api/festivals/:id
 * Update festival (admin)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['name', 'location', 'country', 'continent', 'start_date', 'end_date', 
                          'description', 'image_url', 'poster_url', 'logo_url', 'ticket_url', 
                          'official_website', 'size_popularity'];
    
    const setClause = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    if (!setClause) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const values = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => updates[key]);

    const result = await db.query(
      `UPDATE festivals SET ${setClause} WHERE festival_id = $1 RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Festival not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating festival', error);
    res.status(500).json({ error: 'Failed to update festival' });
  }
});

/**
 * DELETE /api/festivals/:id
 * Delete festival (admin)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM festivals WHERE festival_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Festival not found' });
    }

    res.json({ message: 'Festival deleted successfully' });
  } catch (error) {
    logger.error('Error deleting festival', error);
    res.status(500).json({ error: 'Failed to delete festival' });
  }
});

/**
 * Helper function to format festival response
 */
async function formatFestivalResponse(festival: any): Promise<FestivalResponse> {
  // Get tags
  const tagsResult = await db.query(
    `SELECT t.name FROM tags t
     INNER JOIN festival_tags ft ON t.id = ft.tag_id
     WHERE ft.festival_id = $1`,
    [festival.id]
  );

  // Get artists
  const artistsResult = await db.query(
    `SELECT a.* FROM artists a
     INNER JOIN festival_artists fa ON a.id = fa.artist_id
     WHERE fa.festival_id = $1`,
    [festival.id]
  );

  // Get ticket types
  const ticketsResult = await db.query(
    'SELECT * FROM ticket_types WHERE festival_id = $1',
    [festival.id]
  );

  // Get facts
  const factsResult = await db.query(
    'SELECT * FROM festival_facts WHERE festival_id = $1',
    [festival.id]
  );

  const tags = tagsResult.rows.map(row => row.name);
  const artists = artistsResult.rows.map(row => row.name);
  const artistDetails: ArtistDetail[] = artistsResult.rows.map(row => ({
    name: row.name,
    image: row.image_url,
    instagram: row.instagram_url,
    twitter: row.twitter_url,
    spotify: row.spotify_url,
    website: row.website_url,
  }));

  const ticketPrices = ticketsResult.rows.map(row => ({
    type: row.type,
    price: row.price,
    purchaseUrl: row.purchase_url,
  }));

  const facts: FestivalFactsResponse = {
    ticketPrices,
    ...(factsResult.rows[0] || {}),
  };

  // Calculate ticket price range
  const prices = ticketsResult.rows.map(row => row.price).filter(Boolean);
  const ticketPrice = prices.length > 0 
    ? prices.length === 1 ? prices[0] : `${prices[0]} - ${prices[prices.length - 1]}`
    : undefined;

  return {
    id: festival.festival_id,
    name: festival.name,
    location: festival.location,
    country: festival.country,
    continent: festival.continent,
    startDate: festival.start_date?.toISOString().split('T')[0],
    endDate: festival.end_date?.toISOString().split('T')[0],
    imageUrl: festival.image_url,
    posterUrl: festival.poster_url,
    logoUrl: festival.logo_url,
    description: festival.description,
    ticketPrice,
    ticketUrl: festival.ticket_url,
    tags,
    artists,
    artistDetails,
    facts,
  };
}

export default router;
