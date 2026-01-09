import { db } from './client';
import { ScrapedFestival } from '../types/festival.types';
import { logger } from '../utils/logger';
import { generateFestivalId, getContinent } from '../utils/helpers';
import { ArtistEnricher } from '../enrichment/artist-enricher';

/**
 * Save scraped festivals to database
 */
export async function saveFestivals(festivals: ScrapedFestival[]): Promise<number> {
  let savedCount = 0;
  const artistEnricher = new ArtistEnricher();

  for (const festival of festivals) {
    try {
      await saveFestival(festival, artistEnricher);
      savedCount++;
    } catch (error) {
      logger.error(`Failed to save festival: ${festival.name}`, error);
    }
  }

  logger.info(`Saved ${savedCount} out of ${festivals.length} festivals`);
  return savedCount;
}

/**
 * Save a single festival
 */
async function saveFestival(festival: ScrapedFestival, artistEnricher: ArtistEnricher): Promise<void> {
  await db.transaction(async (client) => {
    // Generate festival ID
    const festivalId = generateFestivalId(festival.name, festival.location);

    // Ensure continent is set
    if (!festival.continent && festival.country) {
      festival.continent = getContinent(festival.country);
    }

    // Insert or update festival
    const festivalResult = await client.query(
      `INSERT INTO festivals (
        festival_id, name, location, country, continent, start_date, end_date,
        description, image_url, poster_url, logo_url, ticket_url, official_website
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (festival_id) DO UPDATE SET
        name = EXCLUDED.name,
        location = EXCLUDED.location,
        country = EXCLUDED.country,
        continent = EXCLUDED.continent,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        description = COALESCE(EXCLUDED.description, festivals.description),
        image_url = COALESCE(EXCLUDED.image_url, festivals.image_url),
        poster_url = COALESCE(EXCLUDED.poster_url, festivals.poster_url),
        logo_url = COALESCE(EXCLUDED.logo_url, festivals.logo_url),
        ticket_url = COALESCE(EXCLUDED.ticket_url, festivals.ticket_url),
        official_website = COALESCE(EXCLUDED.official_website, festivals.official_website),
        updated_at = CURRENT_TIMESTAMP
      RETURNING id`,
      [
        festivalId,
        festival.name,
        festival.location,
        festival.country,
        festival.continent,
        festival.startDate,
        festival.endDate,
        festival.description,
        festival.imageUrl,
        festival.posterUrl,
        festival.logoUrl,
        festival.ticketUrl,
        festival.officialWebsite,
      ]
    );

    const dbFestivalId = festivalResult.rows[0].id;

    // Save tags
    if (festival.tags && festival.tags.length > 0) {
      await saveTags(client, dbFestivalId, festival.tags);
    }

    // Save artists with enrichment
    if (festival.artists && festival.artists.length > 0) {
      await saveArtists(client, dbFestivalId, festival.artists, artistEnricher);
    }

    // Save ticket types
    if (festival.ticketTypes && festival.ticketTypes.length > 0) {
      for (const ticket of festival.ticketTypes) {
        await client.query(
          `INSERT INTO ticket_types (festival_id, type, price, description, purchase_url)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [dbFestivalId, ticket.type, ticket.price, ticket.description, ticket.purchaseUrl]
        );
      }
    }

    // Save facts
    if (festival.facts) {
      await client.query(
        `INSERT INTO festival_facts (
          festival_id, tent_camping, parking_space, car_van_camping, camper_camping,
          pets_allowed, family_oriented, own_food_allowed, own_beverages_allowed, grill_spaces,
          cooking_policy, vendors, special_amenities, allowed_items, prohibited_items
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (festival_id) DO UPDATE SET
          tent_camping = COALESCE(EXCLUDED.tent_camping, festival_facts.tent_camping),
          parking_space = COALESCE(EXCLUDED.parking_space, festival_facts.parking_space),
          car_van_camping = COALESCE(EXCLUDED.car_van_camping, festival_facts.car_van_camping),
          camper_camping = COALESCE(EXCLUDED.camper_camping, festival_facts.camper_camping),
          pets_allowed = COALESCE(EXCLUDED.pets_allowed, festival_facts.pets_allowed),
          family_oriented = COALESCE(EXCLUDED.family_oriented, festival_facts.family_oriented),
          own_food_allowed = COALESCE(EXCLUDED.own_food_allowed, festival_facts.own_food_allowed),
          own_beverages_allowed = COALESCE(EXCLUDED.own_beverages_allowed, festival_facts.own_beverages_allowed),
          grill_spaces = COALESCE(EXCLUDED.grill_spaces, festival_facts.grill_spaces),
          cooking_policy = COALESCE(EXCLUDED.cooking_policy, festival_facts.cooking_policy),
          vendors = COALESCE(EXCLUDED.vendors, festival_facts.vendors),
          special_amenities = COALESCE(EXCLUDED.special_amenities, festival_facts.special_amenities),
          allowed_items = COALESCE(EXCLUDED.allowed_items, festival_facts.allowed_items),
          prohibited_items = COALESCE(EXCLUDED.prohibited_items, festival_facts.prohibited_items)`,
        [
          dbFestivalId,
          festival.facts.tent_camping,
          festival.facts.parking_space,
          festival.facts.car_van_camping,
          festival.facts.camper_camping,
          festival.facts.pets_allowed,
          festival.facts.family_oriented,
          festival.facts.own_food_allowed,
          festival.facts.own_beverages_allowed,
          festival.facts.grill_spaces,
          festival.facts.cooking_policy,
          festival.facts.vendors,
          festival.facts.special_amenities,
          festival.facts.allowed_items,
          festival.facts.prohibited_items,
        ]
      );
    }

    logger.info(`Saved festival: ${festival.name} (${festivalId})`);
  });
}

/**
 * Save tags and associate with festival
 */
async function saveTags(client: any, festivalId: number, tags: string[]): Promise<void> {
  for (const tagName of tags) {
    // Insert tag if not exists
    const tagResult = await client.query(
      'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [tagName]
    );
    const tagId = tagResult.rows[0].id;

    // Associate tag with festival
    await client.query(
      'INSERT INTO festival_tags (festival_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [festivalId, tagId]
    );
  }
}

/**
 * Save artists with enrichment and associate with festival
 */
async function saveArtists(
  client: any,
  festivalId: number,
  artistNames: string[],
  enricher: ArtistEnricher
): Promise<void> {
  // Limit number of artists to enrich (API rate limits)
  const artistsToEnrich = artistNames.slice(0, 20);
  const enrichedArtists = await enricher.enrichArtists(artistsToEnrich);

  for (const artistName of artistNames) {
    const enrichedData = enrichedArtists.get(artistName);

    // Insert artist if not exists
    const artistResult = await client.query(
      `INSERT INTO artists (name, image_url, spotify_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET
         image_url = COALESCE(EXCLUDED.image_url, artists.image_url),
         spotify_url = COALESCE(EXCLUDED.spotify_url, artists.spotify_url),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        artistName,
        enrichedData?.imageUrl,
        enrichedData?.spotifyUrl,
      ]
    );
    const artistId = artistResult.rows[0].id;

    // Associate artist with festival
    await client.query(
      'INSERT INTO festival_artists (festival_id, artist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [festivalId, artistId]
    );
  }
}
