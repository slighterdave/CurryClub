import 'dotenv/config';
import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

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

// Uploads directory setup
const uploadsPath = join(__dirname, 'uploads');
if (!existsSync(uploadsPath)) {
  mkdirSync(uploadsPath, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsPath),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const dotIndex = file.originalname.lastIndexOf('.');
    const ext = dotIndex !== -1 ? file.originalname.slice(dotIndex + 1) : 'jpg';
    cb(null, `${unique}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

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

// Serve uploaded photos
app.use('/uploads', express.static(uploadsPath, { maxAge: '1y' }));

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
    date_visited TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Migration: add date_visited column if it doesn't exist (for existing databases)
const ratingsColumns = db.prepare('PRAGMA table_info(ratings)').all();
if (!ratingsColumns.find(col => col.name === 'date_visited')) {
  db.prepare('ALTER TABLE ratings ADD COLUMN date_visited TEXT').run();
}

// Migration: add photo_path column if it doesn't exist
if (!ratingsColumns.find(col => col.name === 'photo_path')) {
  db.prepare('ALTER TABLE ratings ADD COLUMN photo_path TEXT').run();
}

// Prepared statement for ratings
const insertStmt = db.prepare(`
  INSERT INTO ratings (restaurant, food, service, choice, value, spiceLevel, overall, notes, date_visited, photo_path)
  VALUES (@restaurant, @food, @service, @choice, @value, @spiceLevel, @overall, @notes, @date_visited, @photo_path)
`);

// Admin authentication — password stored as SHA-256 hex in admin_config table.
// The ADMIN_PASSWORD env var takes priority when set.
db.prepare(`
  CREATE TABLE IF NOT EXISTS admin_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`).run();

function getAdminPasswordHash() {
  if (process.env.ADMIN_PASSWORD) {
    return createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex');
  }
  const row = db.prepare("SELECT value FROM admin_config WHERE key = 'password_hash'").get();
  return row ? row.value : null;
}

function isAdminConfigured() {
  return !!(process.env.ADMIN_PASSWORD ||
    db.prepare("SELECT value FROM admin_config WHERE key = 'password_hash'").get());
}

// In-memory session tokens (cleared on server restart)
const adminSessions = new Set();

function adminAuth(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Rate limiters for admin endpoints
const adminLoginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const adminActionRateLimit = rateLimit({ windowMs: 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

// Middleware to prevent caching of API responses
function noCacheMiddleware(req, res, next) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

// GET /api/restaurants
app.get('/api/restaurants', noCacheMiddleware, (req, res) => {
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
app.post('/api/ratings', upload.single('photo'), (req, res) => {
  const body = req.body;
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
  
  // Parse ratings — may arrive as JSON string when sent via FormData
  let ratingsObj;
  try {
    ratingsObj = typeof body.ratings === 'string' ? JSON.parse(body.ratings) : body.ratings;
  } catch {
    return res.status(400).json({ error: 'invalid_ratings' });
  }

  if (!ratingsObj || typeof ratingsObj !== 'object') {
    return res.status(400).json({ error: 'invalid_ratings' });
  }

  const required = ['food', 'service', 'choice', 'value', 'spiceLevel'];
  for (const key of required) {
    const v = Number(ratingsObj[key]);
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return res.status(400).json({ error: `invalid_${key}` });
    }
    ratingsObj[key] = v;
  }

  // Calculate overall
  const overall = (ratingsObj.food + ratingsObj.service + ratingsObj.choice + ratingsObj.value + ratingsObj.spiceLevel) / 5;

  // Validate restaurant exists (use sanitized name)
  const rest = findRestaurantByNameStmt.get(sanitizedRestaurant);
  if (!rest) {
    return res.status(400).json({ error: 'restaurant_not_found', message: 'Restaurant must be added to list before rating.' });
  }

  // Sanitize notes as well
  const sanitizedNotes = body.notes ? sanitizeInput(body.notes) : null;
  
  // Validate notes length (cap at 255 characters)
  if (sanitizedNotes && sanitizedNotes.length > 255) {
    return res.status(400).json({ error: 'notes_too_long', message: 'Notes must be 255 characters or less.' });
  }

  // Validate date_visited (must be a valid YYYY-MM-DD date if provided)
  let dateVisited = null;
  if (body.dateVisited) {
    const dateStr = sanitizeInput(String(body.dateVisited));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(Date.parse(dateStr))) {
      return res.status(400).json({ error: 'invalid_date_visited', message: 'Date Visited must be a valid date in YYYY-MM-DD format.' });
    }
    const today = new Date().toISOString().split('T')[0];
    if (dateStr > today) {
      return res.status(400).json({ error: 'invalid_date_visited', message: 'Date Visited cannot be in the future.' });
    }
    dateVisited = dateStr;
  }

  // Handle uploaded photo
  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

  // proceed to insert (use sanitized values)
  const info = insertStmt.run({
    restaurant: sanitizedRestaurant,
    food: ratingsObj.food,
    service: ratingsObj.service,
    choice: ratingsObj.choice,
    value: ratingsObj.value,
    spiceLevel: ratingsObj.spiceLevel,
    overall: Number(overall.toFixed(2)),
    notes: sanitizedNotes,
    date_visited: dateVisited,
    photo_path: photoPath
  });

  const inserted = db.prepare('SELECT * FROM ratings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ rating: inserted });
});

// GET /api/ratings
app.get('/api/ratings', noCacheMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM ratings ORDER BY created_at DESC').all();
  res.json({ ratings: rows });
});

// GET /api/ratings/restaurant/:name - Get all ratings for a specific restaurant
app.get('/api/ratings/restaurant/:name', noCacheMiddleware, (req, res) => {
  const restaurantName = req.params.name;
  if (!restaurantName) {
    return res.status(400).json({ error: 'restaurant_name_required' });
  }
  
  // Use case-insensitive matching to find all ratings for this restaurant
  const rows = db.prepare(`
    SELECT * FROM ratings 
    WHERE LOWER(restaurant) = LOWER(?) 
    ORDER BY created_at DESC
  `).all(restaurantName);
  
  res.json({ ratings: rows });
});

// GET /api/ratings/date/:date - Get all ratings for a specific date_visited
app.get('/api/ratings/date/:date', noCacheMiddleware, (req, res) => {
  const dateStr = sanitizeInput(String(req.params.date || ''));
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(Date.parse(dateStr))) {
    return res.status(400).json({ error: 'invalid_date', message: 'Date must be in YYYY-MM-DD format.' });
  }
  const rows = db.prepare(`
    SELECT * FROM ratings WHERE date_visited = ? ORDER BY created_at DESC
  `).all(dateStr);
  res.json({ ratings: rows });
});

// GET /api/ratings/aggregate - Get aggregate ratings by restaurant
app.get('/api/ratings/aggregate', noCacheMiddleware, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  
  // Only include ratings for restaurants that currently exist in the restaurants table
  // Use the canonical restaurant name from the restaurants table (handles name updates)
  const query = `
    SELECT 
      rest.name as restaurant,
      COUNT(*) as count,
      AVG(r.overall) as avg_overall,
      AVG(r.food) as avg_food,
      AVG(r.service) as avg_service,
      AVG(r.choice) as avg_choice,
      AVG(r.value) as avg_value,
      AVG(r.spiceLevel) as avg_spice_level
    FROM ratings r
    INNER JOIN restaurants rest ON LOWER(r.restaurant) = LOWER(rest.name)
    GROUP BY rest.name
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

// --- Admin endpoints ---

// GET /api/admin/status - returns whether an admin password has been configured
app.get('/api/admin/status', (req, res) => {
  res.json({ configured: isAdminConfigured() });
});

// POST /api/admin/setup - create admin password on first run (only when unconfigured)
app.post('/api/admin/setup', adminLoginRateLimit, (req, res) => {
  if (isAdminConfigured()) {
    return res.status(409).json({ error: 'already_configured' });
  }
  const password = req.body && req.body.password ? String(req.body.password) : '';
  if (password.length < 8) {
    return res.status(400).json({ error: 'password_too_short', message: 'Password must be at least 8 characters.' });
  }
  const hash = createHash('sha256').update(password).digest('hex');
  db.prepare("INSERT OR REPLACE INTO admin_config (key, value) VALUES ('password_hash', ?)").run(hash);
  res.json({ success: true });
});

// POST /api/admin/login
app.post('/api/admin/login', adminLoginRateLimit, (req, res) => {
  const storedHash = getAdminPasswordHash();
  if (!storedHash) {
    return res.status(503).json({ error: 'admin_not_configured' });
  }
  const password = req.body && req.body.password ? String(req.body.password) : '';
  const passwordDigest = createHash('sha256').update(password).digest('hex');
  if (timingSafeEqual(Buffer.from(passwordDigest, 'hex'), Buffer.from(storedHash, 'hex'))) {
    const token = randomBytes(32).toString('hex');
    adminSessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'invalid_password' });
  }
});

// POST /api/admin/logout
app.post('/api/admin/logout', adminAuth, (req, res) => {
  const auth = req.headers['authorization'];
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) adminSessions.delete(token);
  res.json({ success: true });
});

// GET /api/admin/restaurants
app.get('/api/admin/restaurants', adminAuth, adminActionRateLimit, noCacheMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT r.id, r.name, r.created_at, COUNT(rt.id) as rating_count
    FROM restaurants r
    LEFT JOIN ratings rt ON LOWER(rt.restaurant) = LOWER(r.name)
    GROUP BY r.id
    ORDER BY r.name COLLATE NOCASE
  `).all();
  res.json({ restaurants: rows });
});

// GET /api/admin/ratings
app.get('/api/admin/ratings', adminAuth, adminActionRateLimit, noCacheMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM ratings ORDER BY created_at DESC').all();
  res.json({ ratings: rows });
});

// DELETE /api/admin/ratings/:id/photo - Remove photo from a rating
app.delete('/api/admin/ratings/:id/photo', adminAuth, adminActionRateLimit, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }
  const rating = db.prepare('SELECT * FROM ratings WHERE id = ?').get(id);
  if (!rating) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (!rating.photo_path) {
    return res.status(404).json({ error: 'no_photo' });
  }
  const photoFile = join(__dirname, rating.photo_path);
  if (existsSync(photoFile)) {
    unlinkSync(photoFile);
  }
  db.prepare('UPDATE ratings SET photo_path = NULL WHERE id = ?').run(id);
  res.json({ success: true });
});

// DELETE /api/admin/ratings/:id - Delete a rating (and its photo)
app.delete('/api/admin/ratings/:id', adminAuth, adminActionRateLimit, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }
  const rating = db.prepare('SELECT * FROM ratings WHERE id = ?').get(id);
  if (!rating) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (rating.photo_path) {
    const photoFile = join(__dirname, rating.photo_path);
    if (existsSync(photoFile)) {
      unlinkSync(photoFile);
    }
  }
  db.prepare('DELETE FROM ratings WHERE id = ?').run(id);
  res.json({ success: true });
});

// DELETE /api/admin/restaurants/:id - Delete a restaurant and all its ratings (and photos)
app.delete('/api/admin/restaurants/:id', adminAuth, adminActionRateLimit, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
  if (!restaurant) {
    return res.status(404).json({ error: 'not_found' });
  }
  const ratings = db.prepare('SELECT * FROM ratings WHERE LOWER(restaurant) = LOWER(?)').all(restaurant.name);
  for (const rating of ratings) {
    if (rating.photo_path) {
      const photoFile = join(__dirname, rating.photo_path);
      if (existsSync(photoFile)) {
        unlinkSync(photoFile);
      }
    }
  }
  db.prepare('DELETE FROM ratings WHERE LOWER(restaurant) = LOWER(?)').run(restaurant.name);
  db.prepare('DELETE FROM restaurants WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- end Admin endpoints ---

// Health check
app.get('/_health', (req, res) => {
  res.json({ status: 'ok' });
});

// Multer error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'file_too_large', message: 'File size exceeds the 10 MB limit.' });
  }
  if (err && err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: 'invalid_file_type', message: 'Only image files are allowed.' });
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
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
