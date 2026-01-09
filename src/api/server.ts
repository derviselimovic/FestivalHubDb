import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiLogger as logger } from '../utils/logger';
import { errorHandler, notFoundHandler, requestLogger } from './middleware';
import festivalsRouter from './routes/festivals';
import artistsRouter from './routes/artists';
import healthRouter from './routes/health';
import scrapeRouter from './routes/scrape';
import { db } from '../database/client';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/festivals', festivalsRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/scrape', scrapeRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Festival Scraper API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      festivals: '/api/festivals',
      artists: '/api/artists',
      scrape: '/api/scrape',
    },
  });
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.info(`Festival Scraper API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

// Start the server
startServer();
