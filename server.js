import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || join(__dirname, 'ratings.db');

// Check if dist directory exists
const distPath = join(__dirname, 'dist');
if (!existsSync(distPath)) {
  console.error('❌ ERROR: dist directory not found!');
  console.error('   Please run: npm run build');
  console.error('   This will create the dist directory with the production build.');
  process.exit(1);
}

// Middleware
app.use(express.json());

// Serve static assets with long-term caching (files with content hashes)
app.use('/assets', express.static(join(__dirname, 'dist/assets'), {
  maxAge: '1y',
  immutable: true
}));

// Serve other static files (like logo.png) with moderate caching
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: '1h',
  setHeaders: (res, path) => {
    // index.html should never be cached to ensure routing updates work
    if (basename(path) === 'index.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Database setup
const db = new Database(DB_PATH);

// --- begin restaurants support ---
// Ensure restaurants table exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Prepared statements for restaurants
const insertRestaurantStmt = db.prepare(`
  INSERT INTO restaurants (name) VALUES (?)
`);
const selectRestaurantsStmt = db.prepare(`
  SELECT id, name, created_at FROM restaurants ORDER BY name COLLATE NOCASE
`);
const findRestaurantByNameStmt = db.prepare(`
  SELECT id, name FROM restaurants WHERE name = ?
`);
const findRestaurantByNameCaseInsensitiveStmt = db.prepare(`
  SELECT id, name FROM restaurants WHERE LOWER(name) = LOWER(?)
`);

// Helper function to sanitize input - prevent injection attacks
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  // Remove any null bytes, control characters, and trim
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

// Helper function to capitalize first letter of each word
function capitalizeWords(str) {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
// --- end restaurants support ---

// Ensure ratings table exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant TEXT NOT NULL,
    food INTEGER NOT NULL,
    service INTEGER NOT NULL,
    choice INTEGER NOT NULL,
    value INTEGER NOT NULL,
    spiceLevel INTEGER NOT NULL,
    overall REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Prepared statement for ratings
const insertStmt = db.prepare(`
  INSERT INTO ratings (restaurant, food, service, choice, value, spiceLevel, overall, notes)
  VALUES (@restaurant, @food, @service, @choice, @value, @spiceLevel, @overall, @notes)
`);

// GET /api/restaurants
app.get('/api/restaurants', (req, res) => {
  const rows = selectRestaurantsStmt.all();
  res.json({ restaurants: rows });
});

// POST /api/restaurants
app.post('/api/restaurants', (req, res) => {
  const rawName = (req.body && req.body.name) ? String(req.body.name) : '';
  
  // Sanitize input first
  const sanitizedName = sanitizeInput(rawName);
  if (!sanitizedName) return res.status(400).json({ error: 'name_required' });
  
  // Capitalize the restaurant name
  const capitalizedName = capitalizeWords(sanitizedName);
  
  // Check if restaurant already exists (case-insensitive)
  const existing = findRestaurantByNameCaseInsensitiveStmt.get(capitalizedName);
  if (existing) {
    return res.status(409).json({ 
      error: 'restaurant_exists',
      message: 'A restaurant with this name already exists',
      restaurant: existing 
    });
  }

  try {
    const info = insertRestaurantStmt.run(capitalizedName);
    const created = db.prepare('SELECT id, name, created_at FROM restaurants WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ restaurant: created });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Race condition: another request just inserted it
      const existing = findRestaurantByNameStmt.get(capitalizedName);
      return res.status(409).json({ 
        error: 'restaurant_exists',
        message: 'A restaurant with this name already exists',
        restaurant: existing 
      });
    }
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/ratings
app.post('/api/ratings', (req, res) => {
  const { body } = req;
  if (!body) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  // Validation
  if (typeof body.restaurant !== 'string' || !body.restaurant.trim()) {
    return res.status(400).json({ error: 'invalid_restaurant' });
  }
  
  // Sanitize the restaurant name
  const sanitizedRestaurant = sanitizeInput(body.restaurant);
  if (!sanitizedRestaurant) {
    return res.status(400).json({ error: 'invalid_restaurant' });
  }
  
  if (!body.ratings || typeof body.ratings !== 'object') {
    return res.status(400).json({ error: 'invalid_ratings' });
  }

  const { ratings } = body;
  const required = ['food', 'service', 'choice', 'value', 'spiceLevel'];
  for (const key of required) {
    if (typeof ratings[key] !== 'number' || ratings[key] < 1 || ratings[key] > 5) {
      return res.status(400).json({ error: `invalid_${key}` });
    }
  }

  // Calculate overall
  const overall = (ratings.food + ratings.service + ratings.choice + ratings.value + ratings.spiceLevel) / 5;

  // Validate restaurant exists (use sanitized name)
  const rest = findRestaurantByNameStmt.get(sanitizedRestaurant);
  if (!rest) {
    return res.status(400).json({ error: 'restaurant_not_found', message: 'Restaurant must be added to list before rating.' });
  }

  // Sanitize notes as well
  const sanitizedNotes = body.notes ? sanitizeInput(body.notes) : null;

  // proceed to insert (use sanitized values)
  const info = insertStmt.run({
    restaurant: sanitizedRestaurant,
    food: ratings.food,
    service: ratings.service,
    choice: ratings.choice,
    value: ratings.value,
    spiceLevel: ratings.spiceLevel,
    overall: Number(overall.toFixed(2)),
    notes: sanitizedNotes
  });

  const inserted = db.prepare('SELECT * FROM ratings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ rating: inserted });
});

// GET /api/ratings
app.get('/api/ratings', (req, res) => {
  const rows = db.prepare('SELECT * FROM ratings ORDER BY created_at DESC').all();
  res.json({ ratings: rows });
});

// GET /api/ratings/aggregate - Get aggregate ratings by restaurant
app.get('/api/ratings/aggregate', (req, res) => {
  // Set cache control headers to prevent stale data
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  
  const query = `
    SELECT 
      restaurant,
      COUNT(*) as count,
      AVG(overall) as avg_overall,
      AVG(food) as avg_food,
      AVG(service) as avg_service,
      AVG(choice) as avg_choice,
      AVG(value) as avg_value,
      AVG(spiceLevel) as avg_spice_level
    FROM ratings
    GROUP BY restaurant
    ORDER BY avg_overall DESC
    ${limit ? 'LIMIT ?' : ''}
  `;
  
  const rows = limit 
    ? db.prepare(query).all(limit)
    : db.prepare(query).all();
  
  const aggregates = rows.map((row, index) => ({
    rank: index + 1,
    restaurant: row.restaurant,
    count: row.count,
    avgOverall: Number(row.avg_overall.toFixed(2)),
    avgFood: Number(row.avg_food.toFixed(2)),
    avgService: Number(row.avg_service.toFixed(2)),
    avgChoice: Number(row.avg_choice.toFixed(2)),
    avgValue: Number(row.avg_value.toFixed(2)),
    avgSpiceLevel: Number(row.avg_spice_level.toFixed(2))
  }));
  
  res.json({ aggregates });
});

// Health check
app.get('/_health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
