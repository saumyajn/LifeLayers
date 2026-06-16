# LifeLayers Roadmap

## Product Thesis

LifeLayers is an interactive discovery map for NYC and Jersey City that blends restaurants, things to do, local memories, and Reddit-backed neighborhood conversation.

The product should feel less like a review site and more like a living city interface: useful enough for planning a night out, rich enough to preserve local culture, and polished enough to show strong product engineering taste.

## Positioning

Tagline:

> Explore places through food, stories, and what locals are actually saying.

Primary users:

- Locals looking for restaurants, cafes, walks, date spots, bookstores, galleries, and low-friction plans.
- New residents trying to understand neighborhood personality.
- Visitors who want less touristy recommendations.
- Recruiters and hiring managers evaluating modern frontend, product, and data-system skill.

Differentiation:

- Google Maps is broad but review-heavy.
- Yelp is restaurant-first and often noisy.
- Reddit is honest but scattered.
- Event sites are time-bound and disconnected from neighborhood context.
- LifeLayers combines place, vibe, memory, Reddit pulse, and itinerary planning in one interface.

## Phase 0: Portfolio Prototype

Goal:

Create a visually polished, interactive frontend that proves the concept without needing paid APIs.

Included:

- NYC + Jersey City focused map-like interface.
- Optional live Google Maps JavaScript API + Places Library integration through `VITE_GOOGLE_MAPS_API_KEY`.
- Layer switcher: Eat, Do, Reddit, Memory, Vibe.
- Command palette search.
- Neighborhood selector.
- Place detail panel.
- Reddit Pulse summaries with source subreddit labels.
- Save-to-itinerary interaction.
- Responsive desktop and mobile layout.
- Static sample dataset shaped for future API integration.

Success criteria:

- A recruiter understands the concept in under 10 seconds.
- The UI feels like a real 2026 consumer product, not a school assignment.
- The data model can later support real geospatial queries and Reddit ingestion.

## Phase 1: Real Data Foundations

Goal:

Replace static sample data with credible local data sources.

Data sources:

- Google Maps JavaScript API and Places Library for live restaurant, attraction, landmark, cafe, and venue discovery.
- NYC Open Data: restaurant inspection results, parks, cultural events, public spaces.
- Jersey City Open Data: local civic and place datasets where available.
- Reddit API: local threads from communities such as r/AskNYC, r/nyc, r/FoodNYC, r/jerseycity, r/newjersey, r/Brooklyn, r/astoria, and neighborhood-specific communities.
- Manual curated seed data for iconic and local-favorite places.

Backend:

- Node or Python API for Reddit search ingestion.
- Postgres + PostGIS for places, neighborhoods, saved lists, and geospatial filtering.
- Scheduled jobs to refresh Reddit discussion signals.

Important constraint:

Reddit integration should use official API routes and store only compliant metadata, summaries, links, timestamps, and derived place signals.

## Phase 2: Map And Discovery Engine

Goal:

Move from a stylized prototype map to a true geospatial product.

Build:

- Mapbox GL JS or MapLibre GL map.
- Custom NYC/Jersey City visual style.
- Clustered pins by layer.
- Heatmap mode for Reddit discussion density.
- Neighborhood boundaries.
- "Open now", "rainy day", "late night", "under $25", and "solo-friendly" filters.
- Place ranking based on distance, layer match, mentions, freshness, and saved-list behavior.

## Phase 3: Local Pulse Intelligence

Goal:

Turn messy local discussion into useful, inspectable place intelligence.

Build:

- Thread collection and deduplication.
- Mention extraction for places, dishes, venues, and neighborhoods.
- Sentiment and recurring-warning tags.
- "Locals say" summaries with direct links to original threads.
- Freshness scoring so old hype does not dominate.
- Bias controls: separate tourist-heavy, local-heavy, and food-focused sources.

## Phase 4: Social And Memory Layers

Goal:

Make the product culturally defensible and emotionally memorable.

Build:

- User-submitted memories with text, images, and optional year.
- "What used to be here" timeline.
- Curated walks: "First date in the West Village", "Rainy day in Downtown JC", "Chinatown under $20".
- Public profiles for curators.
- Moderation queue and reporting.

## Phase 5: Monetization Or Acquisition Paths

The project does not need revenue to be valuable, but it should have credible strategic value.

Potential acquirers or interested companies:

- Google Maps, Apple Maps, Yelp, Reddit, Airbnb, TripAdvisor, Foursquare, Eventbrite, Pinterest, local tourism groups.

Possible business paths:

- Local discovery subscriptions.
- Sponsored but clearly labeled neighborhood guides.
- Premium city dashboards for hospitality groups.
- API for local trend detection.
- White-label city memory maps for universities, museums, and tourism boards.

## Interview Story

Strong talking points:

- Product strategy: identified a gap between maps, reviews, Reddit, and local memory.
- Frontend: built an interactive, responsive, layered map interface.
- Data modeling: designed places, neighborhoods, source signals, memories, and itineraries.
- Search UX: command palette and intent-based filters.
- System design: planned ingestion, ranking, geospatial querying, moderation, and source attribution.
- Ethics: designed around attribution, API compliance, privacy, and local community respect.

## Current Build Scope

This repository starts with Phase 0.

The first version is intentionally static and polished. It is a demo-quality product shell that can later be connected to real APIs without redesigning the experience.
