// Festival-related types
export interface Festival {
  id?: number;
  festival_id: string;
  name: string;
  location?: string;
  country?: string;
  continent?: string;
  start_date?: Date | string;
  end_date?: Date | string;
  description?: string;
  image_url?: string;
  poster_url?: string;
  logo_url?: string;
  ticket_url?: string;
  official_website?: string;
  size_popularity?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Artist {
  id?: number;
  name: string;
  image_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  spotify_url?: string;
  website_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface TicketType {
  id?: number;
  festival_id: number;
  type: string;
  price?: string;
  description?: string;
  purchase_url?: string;
}

export interface FestivalFacts {
  id?: number;
  festival_id: number;
  tent_camping?: boolean;
  parking_space?: boolean;
  car_van_camping?: boolean;
  camper_camping?: boolean;
  pets_allowed?: boolean;
  family_oriented?: boolean;
  own_food_allowed?: boolean;
  own_beverages_allowed?: boolean;
  grill_spaces?: boolean;
  cooking_policy?: string;
  vendors?: string;
  special_amenities?: string;
  allowed_items?: string;
  prohibited_items?: string;
}

export interface Tag {
  id?: number;
  name: string;
}

export interface ScrapeLog {
  id?: number;
  source: string;
  status: 'started' | 'completed' | 'failed';
  festivals_found?: number;
  festivals_saved?: number;
  error_message?: string;
  started_at: Date;
  completed_at?: Date;
}

// API Response formats
export interface FestivalResponse {
  id: string;
  name: string;
  location?: string;
  country?: string;
  continent?: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  posterUrl?: string;
  logoUrl?: string;
  description?: string;
  ticketPrice?: string;
  ticketUrl?: string;
  tags: string[];
  artists: string[];
  artistDetails: ArtistDetail[];
  facts: FestivalFactsResponse;
}

export interface ArtistDetail {
  name: string;
  image?: string;
  instagram?: string;
  twitter?: string;
  spotify?: string;
  website?: string;
}

export interface FestivalFactsResponse {
  ticketPrices: TicketPriceInfo[];
  tentCamping?: boolean;
  parkingSpace?: boolean;
  carVanCamping?: boolean;
  camperCamping?: boolean;
  petsAllowed?: boolean;
  familyOriented?: boolean;
  ownFoodAllowed?: boolean;
  ownBeveragesAllowed?: boolean;
  grillSpaces?: boolean;
  cookingPolicy?: string;
  vendors?: string;
  specialAmenities?: string;
  allowedItems?: string;
  prohibitedItems?: string;
}

export interface TicketPriceInfo {
  type: string;
  price?: string;
  purchaseUrl?: string;
}

// Scraper types
export interface ScraperConfig {
  source: string;
  baseUrl: string;
  userAgent?: string;
  delay?: number;
  maxRetries?: number;
  headless?: boolean;
}

export interface ScrapedFestival {
  name: string;
  location?: string;
  country?: string;
  continent?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  imageUrl?: string;
  posterUrl?: string;
  logoUrl?: string;
  ticketUrl?: string;
  officialWebsite?: string;
  tags?: string[];
  artists?: string[];
  ticketTypes?: TicketTypeInfo[];
  facts?: Partial<FestivalFacts>;
}

export interface TicketTypeInfo {
  type: string;
  price?: string;
  description?: string;
  purchaseUrl?: string;
}

export interface ScraperResult {
  source: string;
  festivals: ScrapedFestival[];
  errors: string[];
  success: boolean;
}

// Spotify API types
export interface SpotifyArtistInfo {
  name: string;
  imageUrl?: string;
  spotifyUrl?: string;
}
