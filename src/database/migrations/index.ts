import { db } from './client';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export async function runMigrations(): Promise<void> {
  try {
    logger.info('Running database migrations...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(schema);
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed', error);
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  try {
    logger.warn('Resetting database - all data will be lost!');
    
    await runMigrations();
    
    logger.info('Database reset completed');
  } catch (error) {
    logger.error('Database reset failed', error);
    throw error;
  }
}

export async function seedDatabase(): Promise<void> {
  try {
    logger.info('Seeding database with test data...');
    
    // Insert sample tags
    const tags = ['EDM', 'Techno', 'House', 'Trance', 'Psytrance', 'Rock', 'Metal', 'Hip-Hop', 'Jazz', 'Electronic'];
    for (const tag of tags) {
      await db.query(
        'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [tag]
      );
    }
    
    logger.info('Database seeding completed');
  } catch (error) {
    logger.error('Database seeding failed', error);
    throw error;
  }
}
