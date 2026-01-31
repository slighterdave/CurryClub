import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || join(__dirname, 'ratings.db');

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

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
  const name = (req.body && req.body.name) ? String(req.body.name).trim() : '';
  if (!name) return res.status(400).json({ error: 'name_required' });

  try {
    const info = insertRestaurantStmt.run(name);
    const created = db.prepare('SELECT id, name, created_at FROM restaurants WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ restaurant: created });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // already exists
      const existing = findRestaurantByNameStmt.get(name);
      return res.status(200).json({ restaurant: existing, notice: 'already_exists' });
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

  const schema = {
    restaurant: 'string',
    ratings: {
      food: 'number',
      service: 'number',
      choice: 'number',
      value: 'number',
      spiceLevel: 'number'
    },
    notes: 'string?'
  };

  // Simple validation
  if (typeof body.restaurant !== 'string' || !body.restaurant.trim()) {
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

  // Validate restaurant exists
  const { restaurant, notes } = body;
  const rest = findRestaurantByNameStmt.get(restaurant);
  if (!rest) {
    return res.status(400).json({ error: 'restaurant_not_found', message: 'Restaurant must be added to list before rating.' });
  }

  // proceed to insert (unchanged)
  const info = insertStmt.run({
    restaurant, // keep storing the string for now
    food: ratings.food,
    service: ratings.service,
    choice: ratings.choice,
    value: ratings.value,
    spiceLevel: ratings.spiceLevel,
    overall: Number(overall.toFixed(2)),
    notes: notes || null
  });

  const inserted = db.prepare('SELECT * FROM ratings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ rating: inserted });
});

// GET /api/ratings
app.get('/api/ratings', (req, res) => {
  const rows = db.prepare('SELECT * FROM ratings ORDER BY created_at DESC').all();
  res.json({ ratings: rows });
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
