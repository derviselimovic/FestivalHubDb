# Festival Scraper System 🎵🎉

A comprehensive festival data scraping and aggregation system built with Node.js and TypeScript. Automatically collects music festival information from multiple sources, enriches it with artist data from Spotify, stores everything in PostgreSQL, and provides both REST API and CLI interfaces.

## 🌟 Features

- **Multi-Source Scraping**: Aggregates festival data from Festicket, Songkick, and Bandsintown
- **Artist Enrichment**: Automatically enriches artist profiles with Spotify API data
- **Smart Data Storage**: Normalized PostgreSQL schema with hybrid JSON output format
- **REST API**: Comprehensive Express.js API with filtering and search capabilities
- **CLI Tools**: Command-line interface for scraping and database management
- **Scheduled Jobs**: Automated weekly scraping with node-cron
- **Robust Logging**: Winston-based structured logging with file rotation
- **Docker Support**: Full Docker and docker-compose configuration
- **Railway Ready**: Pre-configured for easy deployment to Railway.app

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Usage](#usage)
  - [Running the API Server](#running-the-api-server)
  - [CLI Commands](#cli-commands)
  - [Scheduled Jobs](#scheduled-jobs)
- [API Documentation](#api-documentation)
- [Docker Deployment](#docker-deployment)
- [Railway.app Deployment](#railwayapp-deployment)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🔧 Prerequisites

- **Node.js**: Version 20.x or higher
- **PostgreSQL**: Version 15 or higher
- **Spotify API Credentials**: For artist enrichment (optional but recommended)
- **Docker** (optional): For containerized deployment

## 📦 Installation

1. **Clone the repository**
```bash
git clone https://github.com/derviselimovic/FestivalHubDb.git
cd FestivalHubDb
```

2. **Install dependencies**
```bash
npm install
```

3. **Install Playwright browsers**
```bash
npx playwright install chromium
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/festivalhub

# Server (required)
PORT=3000
NODE_ENV=development

# Spotify API (optional but recommended for artist enrichment)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Scraping Configuration (optional)
SCRAPE_DELAY_MS=3000
MAX_RETRIES=3
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# Jobs (optional)
ENABLE_SCHEDULER=true
SCRAPE_CRON=0 2 * * 1

# Logging (optional)
LOG_LEVEL=info
```

### Getting Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Create a new app
4. Copy the Client ID and Client Secret

## 🗄️ Database Setup

### Local PostgreSQL

1. **Create the database**
```bash
createdb festivalhub
```

2. **Run migrations**
```bash
npm run db:migrate
```

3. **Seed test data (optional)**
```bash
npm run db:seed
```

### Docker PostgreSQL

```bash
docker-compose up -d postgres
npm run db:migrate
```

## 🚀 Usage

### Running the API Server

**Development mode with auto-reload:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`

### CLI Commands

#### Scraping Commands

```bash
# Scrape all sources
npm run scrape:all

# Scrape individual sources
npm run scrape:festicket
npm run scrape:songkick
npm run scrape:bandsintown
```

#### Database Commands

```bash
# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Reset database (WARNING: destroys all data)
npm run db:reset
```

### Scheduled Jobs

Start the job scheduler for automated scraping:

```bash
npm run jobs:start
```

**Default Schedule:**
- **Weekly Scraping**: Every Monday at 2 AM UTC
- **Data Cleanup**: Daily at 3 AM UTC (removes festivals older than 3 months)

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T22:00:00.000Z",
  "database": "connected",
  "uptime": 123.456,
  "environment": "development"
}
```

#### Festivals

**List all festivals**
```http
GET /api/festivals?country=Germany&continent=Europe&tag=Techno&limit=50&offset=0
```

**Query Parameters:**
- `country` (optional): Filter by country
- `continent` (optional): Filter by continent
- `tag` (optional): Filter by genre/tag
- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "festivals": [...],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

**Get festival by ID**
```http
GET /api/festivals/:id
```

**Response:**
```json
{
  "id": "ultra-miami-2026",
  "name": "Ultra Music Festival",
  "location": "Miami, Florida",
  "country": "United States",
  "continent": "North America",
  "startDate": "2026-03-27",
  "endDate": "2026-03-29",
  "imageUrl": "https://...",
  "posterUrl": "https://...",
  "logoUrl": "https://...",
  "description": "...",
  "ticketPrice": "$399 - $1,699",
  "ticketUrl": "https://...",
  "tags": ["EDM", "Electronic"],
  "artists": ["Tiësto", "David Guetta"],
  "artistDetails": [
    {
      "name": "Tiësto",
      "image": "https://...",
      "instagram": "https://instagram.com/tiesto",
      "twitter": "https://twitter.com/tiesto",
      "spotify": "https://open.spotify.com/artist/...",
      "website": "https://..."
    }
  ],
  "facts": {
    "ticketPrices": [
      {
        "type": "General Admission",
        "price": "$399",
        "purchaseUrl": "https://..."
      }
    ],
    "tentCamping": false,
    "parkingSpace": true,
    "carVanCamping": false
  }
}
```

**Create festival (Admin)**
```http
POST /api/festivals
Content-Type: application/json

{
  "festival_id": "my-festival-2026",
  "name": "My Festival",
  "location": "Berlin, Germany",
  "start_date": "2026-06-15",
  "end_date": "2026-06-17"
}
```

**Update festival (Admin)**
```http
PUT /api/festivals/:id
```

**Delete festival (Admin)**
```http
DELETE /api/festivals/:id
```

#### Artists

**List all artists**
```http
GET /api/artists?limit=100&offset=0
```

**Get artist details**
```http
GET /api/artists/:id
```

**Get festivals for an artist**
```http
GET /api/artists/:id/festivals
```

#### Scraping

**Trigger manual scrape**
```http
POST /api/scrape/trigger
Content-Type: application/json

{
  "source": "all"  // or "festicket", "songkick", "bandsintown"
}
```

**Get scrape status**
```http
GET /api/scrape/status?jobId=abc123
```

**Get scrape logs**
```http
GET /api/scrape/logs?limit=50&offset=0&source=festicket
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended for Local Development)

1. **Start all services**
```bash
docker-compose up -d
```

2. **View logs**
```bash
docker-compose logs -f app
```

3. **Stop services**
```bash
docker-compose down
```

### Using Docker only

1. **Build the image**
```bash
docker build -t festival-scraper .
```

2. **Run the container**
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e SPOTIFY_CLIENT_ID=... \
  -e SPOTIFY_CLIENT_SECRET=... \
  festival-scraper
```

## 🚂 Railway.app Deployment

### Step-by-Step Deployment Guide

1. **Create a Railway account**
   - Go to [Railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create a new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your forked repository

3. **Add PostgreSQL database**
   - Click "New"
   - Select "Database"
   - Choose "PostgreSQL"
   - Railway will automatically provision a database

4. **Configure environment variables**
   
   In your Railway project settings, add these variables:
   
   ```
   DATABASE_URL=${POSTGRESQL_URL}  (automatically set by Railway)
   PORT=3000
   NODE_ENV=production
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ENABLE_SCHEDULER=true
   SCRAPE_CRON=0 2 * * 1
   LOG_LEVEL=info
   ```

5. **Deploy**
   - Railway will automatically build and deploy your app
   - The build command from `railway.json` will be used
   - Monitor the build logs in the Railway dashboard

6. **Run initial migration**
   
   In Railway's terminal or using Railway CLI:
   ```bash
   npm run db:migrate
   ```

7. **Verify deployment**
   - Railway will provide a public URL
   - Visit `https://your-app.railway.app/api/health`
   - You should see a healthy status

8. **Trigger first scrape (optional)**
   ```bash
   curl -X POST https://your-app.railway.app/api/scrape/trigger \
     -H "Content-Type: application/json" \
     -d '{"source":"all"}'
   ```

### Railway CLI (Optional)

Install Railway CLI for easier management:

```bash
npm i -g @railway/cli
railway login
railway link
railway up
```

## 📁 Project Structure

```
festival-scraper/
├── src/
│   ├── scrapers/           # Web scraping modules
│   │   ├── base-scraper.ts
│   │   ├── festicket.ts
│   │   ├── songkick.ts
│   │   ├── bandsintown.ts
│   │   └── individual-festival.ts
│   ├── api/                # Express.js API
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── festivals.ts
│   │   │   ├── artists.ts
│   │   │   ├── scrape.ts
│   │   │   └── health.ts
│   │   └── middleware/
│   │       └── index.ts
│   ├── database/           # Database layer
│   │   ├── schema.sql
│   │   ├── client.ts
│   │   ├── save-festivals.ts
│   │   └── migrations/
│   │       └── index.ts
│   ├── enrichment/         # Data enrichment
│   │   ├── artist-enricher.ts
│   │   └── image-fetcher.ts
│   ├── cli/                # CLI interface
│   │   └── index.ts
│   ├── jobs/               # Scheduled jobs
│   │   └── scheduler.ts
│   ├── utils/              # Utilities
│   │   ├── logger.ts
│   │   └── helpers.ts
│   └── types/              # TypeScript types
│       └── festival.types.ts
├── logs/                   # Application logs
├── dist/                   # Compiled JavaScript
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── railway.json
├── Procfile
├── tsconfig.json
├── package.json
└── README.md
```

## 🗂️ Database Schema

### Tables

- **festivals**: Main festival information
- **artists**: Artist profiles with enriched data
- **festival_artists**: Many-to-many relationship between festivals and artists
- **ticket_types**: Ticket pricing and types
- **festival_facts**: Festival amenities and policies
- **tags**: Genre and category tags
- **festival_tags**: Many-to-many relationship between festivals and tags
- **scrape_logs**: Monitoring and logging of scraping operations

### Entity Relationship Diagram

```
festivals (1) ----< (N) festival_artists (N) >---- (1) artists
festivals (1) ----< (N) festival_tags (N) >---- (1) tags
festivals (1) ----< (N) ticket_types
festivals (1) ---- (1) festival_facts
```

## 🔍 Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solutions**:
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running: `pg_isready`
- Check firewall settings
- For Docker: ensure containers are on the same network

### Scraping Failures

**Problem**: Scrapers returning no data

**Solutions**:
- Check internet connection
- Verify source websites are accessible
- Increase SCRAPE_DELAY_MS if being rate-limited
- Check logs in `logs/error.log`

### Playwright Issues

**Problem**: Browser launch failures

**Solutions**:
```bash
# Reinstall browsers
npx playwright install --with-deps chromium

# For Docker, use the alpine image with chromium pre-installed
```

### API Not Starting

**Problem**: Server fails to start

**Solutions**:
- Check if port 3000 is available: `lsof -i :3000`
- Verify all environment variables are set
- Check logs: `tail -f logs/combined.log`
- Ensure database migrations have run

### Spotify API Issues

**Problem**: Artist enrichment not working

**Solutions**:
- Verify Spotify credentials are correct
- Check API rate limits
- Ensure credentials have proper permissions
- Note: Artist enrichment is optional, app works without it

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Festival data sources: Festicket, Songkick, Bandsintown
- Artist data: Spotify Web API
- Built with: Node.js, TypeScript, Express.js, Playwright, PostgreSQL

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

---

**Happy Festival Hunting! 🎉🎵**