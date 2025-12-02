# Backend Repository

This is the backend server built with Node.js and Express.

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL or your configured database

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the required environment variables:
   ```
   PORT=5000
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_db_name
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   JWT_SECRET=your_jwt_secret
   ```

### Running the Application

**Development mode:**
```bash
npm start
```

**With nodemon (auto-reload):**
```bash
npm run dev
```

## Project Structure

- `routes/` - API route handlers
- `models/` - Database models
- `middleware/` - Express middleware
- `config/` - Configuration files (database, etc.)
- `utils/` - Utility functions (email service, etc.)
- `server.js` - Main server entry point

## API Endpoints

- `/api/users` - User management
- `/api/products` - Product management
- `/api/orders` - Order management
- `/api/admin` - Admin routes
- `/api/tickets` - Support tickets

## Technologies Used

- Node.js
- Express
- PostgreSQL
- Supabase
- JWT Authentication
