// Load env vars FIRST - before any imports that use environment variables
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('ENV loaded - SUPABASE_URL:', process.env.SUPABASE_URL);

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import christmasRoutes from './routes/christmasRoutes.js';

// Connect to database
connectDB();

const app = express();

// Global OTP store for password reset
app.locals.otpStore = new Map();

// Middleware to attach OTP store to requests
app.use((req, res, next) => {
  req.otpStore = app.locals.otpStore;
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Nikola Fashion E-commerce API' });
});

// Categories endpoint
app.get('/api/categories', (req, res) => {
  const CATEGORIES = ['men', 'women', 'kids', 'accessories'];
  const categories = CATEGORIES.map((cat, idx) => ({
    _id: idx.toString(),
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    slug: cat
  }));
  res.json(categories);
});

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/christmas', christmasRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
