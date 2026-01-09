-- Festival Scraper Database Schema
-- PostgreSQL 15+

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS scrape_logs CASCADE;
DROP TABLE IF EXISTS festival_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS festival_facts CASCADE;
DROP TABLE IF EXISTS ticket_types CASCADE;
DROP TABLE IF EXISTS festival_artists CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS festivals CASCADE;

-- Festivals main table
CREATE TABLE festivals (
    id SERIAL PRIMARY KEY,
    festival_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    location VARCHAR(500),
    country VARCHAR(100),
    continent VARCHAR(100),
    start_date DATE,
    end_date DATE,
    description TEXT,
    image_url TEXT,
    poster_url TEXT,
    logo_url TEXT,
    ticket_url TEXT,
    official_website TEXT,
    size_popularity VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Artists table
CREATE TABLE artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) UNIQUE NOT NULL,
    image_url TEXT,
    instagram_url TEXT,
    twitter_url TEXT,
    spotify_url TEXT,
    website_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Festival-Artist junction table
CREATE TABLE festival_artists (
    festival_id INTEGER REFERENCES festivals(id) ON DELETE CASCADE,
    artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    PRIMARY KEY (festival_id, artist_id)
);

-- Ticket types
CREATE TABLE ticket_types (
    id SERIAL PRIMARY KEY,
    festival_id INTEGER REFERENCES festivals(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    price VARCHAR(100),
    description TEXT,
    purchase_url TEXT
);

-- Festival facts/amenities
CREATE TABLE festival_facts (
    id SERIAL PRIMARY KEY,
    festival_id INTEGER REFERENCES festivals(id) ON DELETE CASCADE UNIQUE,
    tent_camping BOOLEAN DEFAULT false,
    parking_space BOOLEAN DEFAULT false,
    car_van_camping BOOLEAN DEFAULT false,
    camper_camping BOOLEAN DEFAULT false,
    pets_allowed BOOLEAN DEFAULT false,
    family_oriented BOOLEAN DEFAULT false,
    own_food_allowed BOOLEAN DEFAULT false,
    own_beverages_allowed BOOLEAN DEFAULT false,
    grill_spaces BOOLEAN DEFAULT false,
    cooking_policy TEXT,
    vendors TEXT,
    special_amenities TEXT,
    allowed_items TEXT,
    prohibited_items TEXT
);

-- Tags/Genres
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Festival-Tag junction table
CREATE TABLE festival_tags (
    festival_id INTEGER REFERENCES festivals(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (festival_id, tag_id)
);

-- Scrape logs for monitoring
CREATE TABLE scrape_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100),
    status VARCHAR(50),
    festivals_found INTEGER,
    festivals_saved INTEGER,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_festivals_festival_id ON festivals(festival_id);
CREATE INDEX idx_festivals_start_date ON festivals(start_date);
CREATE INDEX idx_festivals_country ON festivals(country);
CREATE INDEX idx_festivals_continent ON festivals(continent);
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_festival_artists_festival_id ON festival_artists(festival_id);
CREATE INDEX idx_festival_artists_artist_id ON festival_artists(artist_id);
CREATE INDEX idx_ticket_types_festival_id ON ticket_types(festival_id);
CREATE INDEX idx_festival_facts_festival_id ON festival_facts(festival_id);
CREATE INDEX idx_festival_tags_festival_id ON festival_tags(festival_id);
CREATE INDEX idx_festival_tags_tag_id ON festival_tags(tag_id);
CREATE INDEX idx_scrape_logs_source ON scrape_logs(source);
CREATE INDEX idx_scrape_logs_started_at ON scrape_logs(started_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating updated_at
CREATE TRIGGER update_festivals_updated_at BEFORE UPDATE ON festivals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
