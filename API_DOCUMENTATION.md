# API Documentation

## Restaurant Submission API

### POST /api/restaurants

Submits a new restaurant to the database.

#### Request Body

```json
{
  "name": "string (required)"
}
```

#### Input Processing

The API automatically processes the restaurant name with the following features:

1. **Input Sanitization**: Removes null bytes, control characters, and dangerous content to prevent injection attacks
2. **Capitalization**: Automatically capitalizes the first letter of each word (e.g., "spice kingdom" → "Spice Kingdom")
3. **Duplicate Prevention**: Case-insensitive duplicate checking prevents multiple entries of the same restaurant

#### Response Codes

- **201 Created**: Restaurant successfully added
  ```json
  {
    "restaurant": {
      "id": 1,
      "name": "Spice Kingdom",
      "created_at": "2026-02-01 15:36:26"
    }
  }
  ```

- **400 Bad Request**: Missing or invalid restaurant name
  ```json
  {
    "error": "name_required"
  }
  ```

- **409 Conflict**: Restaurant already exists (case-insensitive match)
  ```json
  {
    "error": "restaurant_exists",
    "message": "A restaurant with this name already exists",
    "restaurant": {
      "id": 1,
      "name": "Spice Kingdom"
    }
  }
  ```

- **500 Internal Server Error**: Database or server error
  ```json
  {
    "error": "internal_error"
  }
  ```

#### Examples

**Example 1: Adding a new restaurant**
```bash
curl -X POST http://localhost:3001/api/restaurants \
  -H "Content-Type: application/json" \
  -d '{"name":"spice kingdom"}'
```

Response:
```json
{
  "restaurant": {
    "id": 1,
    "name": "Spice Kingdom",
    "created_at": "2026-02-01 15:36:26"
  }
}
```

**Example 2: Attempting to add a duplicate (different casing)**
```bash
curl -X POST http://localhost:3001/api/restaurants \
  -H "Content-Type: application/json" \
  -d '{"name":"SPICE KINGDOM"}'
```

Response:
```json
{
  "error": "restaurant_exists",
  "message": "A restaurant with this name already exists",
  "restaurant": {
    "id": 1,
    "name": "Spice Kingdom"
  }
}
```

### GET /api/restaurants

Retrieves all restaurants ordered alphabetically (case-insensitive).

#### Response

```json
{
  "restaurants": [
    {
      "id": 1,
      "name": "Spice Kingdom",
      "created_at": "2026-02-01 15:36:26"
    },
    {
      "id": 2,
      "name": "Taj Mahal Restaurant",
      "created_at": "2026-02-01 15:36:26"
    }
  ]
}
```

## Rating Submission API

### POST /api/ratings

Submits a rating for a restaurant. The restaurant must already exist in the database.

#### Security Features

- **Input Sanitization**: Restaurant names and notes are sanitized to prevent injection attacks
- **Validation**: All rating values must be between 1-5
- **Restaurant Verification**: The restaurant must exist before a rating can be submitted

#### Request Body

```json
{
  "restaurant": "string (required)",
  "ratings": {
    "food": "number 1-5 (required)",
    "service": "number 1-5 (required)",
    "choice": "number 1-5 (required)",
    "value": "number 1-5 (required)",
    "spiceLevel": "number 1-5 (required)"
  },
  "notes": "string (optional)"
}
```

#### Response Codes

- **201 Created**: Rating successfully submitted
- **400 Bad Request**: Invalid restaurant, missing ratings, or invalid values
- **500 Internal Server Error**: Database or server error

## Security Measures

All API endpoints implement the following security measures:

1. **Input Sanitization**: 
   - Removal of null bytes (`\0`)
   - Removal of control characters (ASCII 0x00-0x1F, 0x7F)
   - Trimming of whitespace

2. **SQL Injection Prevention**:
   - All database queries use prepared statements with parameterized values
   - No dynamic SQL query construction with user input

3. **Data Validation**:
   - Type checking for all inputs
   - Range validation for numeric values
   - Required field validation
