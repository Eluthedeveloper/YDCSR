# YDCS Radio Home Management System - Setup

## Prerequisites
- Node.js >= 18
- MySQL database server
- npm

## Backend Setup

```bash
cd backend
npm install
# Create MySQL database named 'ydcs_radio_home'
# Edit .env with your database credentials
npm run db:push    # Creates all database tables
npm run dev        # Starts API server on port 5000
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev        # Starts dev server on port 5173
```

## Default Login
- URL: http://localhost:5173
- Username: `admin`
- Password: `admin123`

## API Documentation
- Swagger UI: http://localhost:5000/api-docs

## Project Structure

### Backend (backend/src/)
- `config/` - Environment configuration
- `db/schema/` - Drizzle ORM database schema
- `middleware/` - Auth, audit, error handling middleware
- `services/` - Business logic layer
- `controllers/` - Request handlers
- `routes/` - API route definitions
- `validators/` - Zod validation schemas
- `utils/` - Helper functions (serial generation, pagination)

### Frontend (frontend/src/)
- `contexts/` - React Context providers (Auth, Theme, Toast)
- `components/` - Reusable UI components
- `pages/` - Page components
- `services/` - API client with Axios interceptors
- `types/` - TypeScript type definitions
