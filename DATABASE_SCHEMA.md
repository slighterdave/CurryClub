# Database Schema Documentation

## Overview

The CurryClub application uses **SQLite** as its database engine with **better-sqlite3** as the driver. The database file is stored as `ratings.db` in the project root directory (configurable via the `DB_PATH` environment variable).

## Where Are Ratings Stored?

**Ratings are stored in the `ratings` table** within the `ratings.db` SQLite database file. This table contains individual rating entries submitted by users, including scores for food, service, choice, value, and spice level, along with an overall calculated rating.

---

## Database Tables

### 1. `restaurants` Table

The `restaurants` table stores the list of curry houses that can be rated.

#### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for each restaurant |
| `name` | TEXT | NOT NULL, UNIQUE | Restaurant name (case-insensitive uniqueness enforced at application level) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp when the restaurant was added |

#### SQL Definition

```sql
CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### Key Features

- **Unique Restaurant Names**: Each restaurant name must be unique (enforced with case-insensitive checks)
- **Auto-capitalization**: Restaurant names are automatically capitalized (first letter of each word) before storage
- **Input Sanitization**: All restaurant names are sanitized to remove null bytes and control characters

#### Example Data

```json
{
  "id": 1,
  "name": "Taj Mahal",
  "created_at": "2024-01-15 12:30:45"
}
```

---

### 2. `ratings` Table

The `ratings` table stores individual rating submissions for restaurants.

#### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for each rating |
| `restaurant` | TEXT | NOT NULL | Name of the restaurant being rated |
| `food` | INTEGER | NOT NULL | Food quality rating (1-5) |
| `service` | INTEGER | NOT NULL | Service quality rating (1-5) |
| `choice` | INTEGER | NOT NULL | Menu choice/variety rating (1-5) |
| `value` | INTEGER | NOT NULL | Value for money rating (1-5) |
| `spiceLevel` | INTEGER | NOT NULL | Spice level rating (1-5) |
| `overall` | REAL | NOT NULL | Calculated overall rating (average of all categories) |
| `notes` | TEXT | NULL | Optional notes/comments about the visit |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp when the rating was submitted |

#### SQL Definition

```sql
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
```

#### Key Features

- **Rating Scale**: All rating categories use a 1-5 scale
- **Calculated Overall**: The `overall` field is automatically calculated as the average of the five rating categories (food, service, choice, value, spiceLevel)
- **Restaurant Validation**: Before a rating can be submitted, the restaurant must exist in the `restaurants` table
- **Input Sanitization**: All text inputs (restaurant name, notes) are sanitized to prevent injection attacks
- **Chronological Ordering**: Ratings are typically retrieved in reverse chronological order (newest first)

#### Rating Categories

1. **Food** (1-5): Quality and taste of the food
2. **Service** (1-5): Quality of customer service
3. **Choice** (1-5): Variety and options on the menu
4. **Value** (1-5): Value for money
5. **Spice Level** (1-5): Appropriateness of spice level
6. **Overall** (calculated): Average of all five categories, rounded to 2 decimal places

#### Example Data

```json
{
  "id": 42,
  "restaurant": "Taj Mahal",
  "food": 5,
  "service": 4,
  "choice": 5,
  "value": 4,
  "spiceLevel": 5,
  "overall": 4.60,
  "notes": "Excellent chicken tikka masala!",
  "created_at": "2024-01-15 19:45:30"
}
```

---

## Table Relationships

While there are no formal foreign key constraints in the database, there is a logical relationship between the tables:

- **restaurants** (1) → (many) **ratings**
- Each restaurant can have multiple ratings
- A rating must reference an existing restaurant name (enforced at the application level)
- The relationship is maintained through case-insensitive matching on the `restaurant.name` field

### Aggregate Queries

The application joins these tables to produce aggregate statistics:

```sql
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
```

This query produces ranked leaderboards showing the best-rated restaurants based on their average overall score.

---

## Database Access

### Location

- **File**: `ratings.db` (default)
- **Path**: Project root directory
- **Environment Variable**: `DB_PATH` (can be overridden)

### API Endpoints

The database is accessed through the following REST API endpoints:

#### Restaurants
- `GET /api/restaurants` - List all restaurants
- `POST /api/restaurants` - Add a new restaurant

#### Ratings
- `GET /api/ratings` - List all ratings
- `POST /api/ratings` - Submit a new rating
- `GET /api/ratings/aggregate` - Get aggregate statistics by restaurant

For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

---

## Security Features

### Input Sanitization

All user inputs are sanitized before being stored in the database:

```javascript
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')           // Remove null bytes
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}
```

### Prepared Statements

All database queries use prepared statements to prevent SQL injection attacks:

```javascript
const insertStmt = db.prepare(`
  INSERT INTO ratings (restaurant, food, service, choice, value, spiceLevel, overall, notes)
  VALUES (@restaurant, @food, @service, @choice, @value, @spiceLevel, @overall, @notes)
`);
```

### Validation

- Restaurant names must exist before ratings can be submitted
- All rating values must be integers between 1 and 5
- Restaurant names are validated for case-insensitive uniqueness

---

## Technical Details

### Database Driver

- **Library**: better-sqlite3
- **Type**: Synchronous SQLite3 driver
- **Features**: Better performance than async alternatives for this use case

### Initialization

The database and tables are initialized automatically when the server starts:

```javascript
const db = new Database(DB_PATH);

// Tables are created if they don't exist
db.prepare(`CREATE TABLE IF NOT EXISTS restaurants ...`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS ratings ...`).run();
```

### Graceful Shutdown

The database connection is properly closed on application shutdown:

```javascript
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
```

---

## Summary

- **Ratings Storage**: The `ratings` table in `ratings.db` stores all rating data
- **Database Engine**: SQLite with better-sqlite3 driver
- **Tables**: Two tables - `restaurants` (the list of curry houses) and `ratings` (individual rating submissions)
- **Security**: Input sanitization and prepared statements prevent injection attacks
- **Relationship**: Ratings reference restaurants by name with case-insensitive matching
