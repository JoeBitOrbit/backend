import express from 'express';
import multer from 'multer';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import { uploadImage } from '../utils/supabaseService.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Categories list (from Product schema enum)
const CATEGORIES = ['men', 'women', 'kids', 'accessories'];

// @route   GET /api/products/categories
// @desc    Get all available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = CATEGORIES.map((cat, idx) => ({
      _id: idx.toString(),
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      slug: cat
    }));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/next-code
// @desc    Get next product code (for admin)
router.get('/next-code', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const count = await Product.countDocuments();
    const nextCode = `PROD-${String(count + 1).padStart(5, '0')}`;
    res.json({ code: nextCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products/upload-image
// @desc    Upload image to Supabase
router.post('/upload-image', authenticateToken, authorizeRole(['admin']), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = await uploadImage(req.file, 'products');
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/search/:query
// @desc    Search products by name
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products
// @desc    Get all products
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = {};
    
    if (category) {
      // Case-insensitive category filter
      query.category = { $regex: category, $options: 'i' };
    }
    if (featured === 'true') query.featured = true;

    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products
// @desc    Create a product (Admin only)
router.post('/', authenticateToken, authorizeRole(['admin']), upload.array('images'), async (req, res) => {
  try {
    const { name, description, price, category, sizes, colors, stock, featured, images: imageUrls } = req.body;
    
    let images = [];
    
    // If images are sent as URLs in the payload (from frontend pre-upload)
    if (imageUrls) {
      if (Array.isArray(imageUrls)) {
        images = imageUrls;
      } else if (typeof imageUrls === 'string') {
        images = [imageUrls];
      }
    }
    
    // Fallback: if files are attached directly
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = await uploadImage(file, 'products');
        images.push(imageUrl);
      }
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      sizes: sizes ? (typeof sizes === 'string' ? JSON.parse(sizes) : sizes) : [],
      colors: colors ? (typeof colors === 'string' ? JSON.parse(colors) : colors) : [],
      images,
      stock,
      featured: featured === 'true'
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product (Admin only)
router.put('/:id', authenticateToken, authorizeRole(['admin']), upload.array('images'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, description, price, category, sizes, colors, stock, featured } = req.body;
    
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.sizes = sizes ? JSON.parse(sizes) : product.sizes;
    product.colors = colors ? JSON.parse(colors) : product.colors;
    product.stock = stock !== undefined ? stock : product.stock;
    product.featured = featured === 'true' ? true : product.featured;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = await uploadImage(file, 'products');
        product.images.push(imageUrl);
      }
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 5, sort = 'newest', rating = null } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { product: req.params.id };
    if (rating) {
      query.rating = parseInt(rating);
    }

    // Get total count
    const total = await Review.countDocuments(query);

    // Get reviews with pagination
    let reviewsQuery = Review.find(query).skip(skip).limit(limitNum);
    
    if (sort === 'highest') {
      reviewsQuery = reviewsQuery.sort({ rating: -1, createdAt: -1 });
    } else {
      reviewsQuery = reviewsQuery.sort({ createdAt: -1 });
    }

    const reviews = await reviewsQuery;

    // Calculate rating breakdown
    const allReviews = await Review.find({ product: req.params.id });
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    
    allReviews.forEach(r => {
      breakdown[r.rating]++;
      totalRating += r.rating;
    });

    const avgRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0;

    res.json({
      reviews,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      breakdown,
      averageRating: avgRating
    });
  } catch (error) {
    console.error('GET reviews error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products/:id/reviews
// @desc    Add a review
router.post('/:id/reviews', async (req, res) => {
  try {
    const { name, email, rating, comment } = req.body;

    if (!name || !email || !rating || !comment) {
      return res.status(400).json({ message: 'Name, email, rating, and comment are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if product exists
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create review
    const review = new Review({
      product: req.params.id,
      name: name || 'Anonymous',
      email,
      rating: parseInt(rating),
      comment,
      verifiedPurchase: false // TODO: Check actual purchase history
    });

    await review.save();
    res.status(201).json(review);
  } catch (error) {
    console.error('POST review error:', error);
    res.status(400).json({ message: error.message });
  }
});

// @route   PUT /api/products/:id/reviews/:reviewId
// @desc    Edit a review (user can edit their own)
router.put('/:id/reviews/:reviewId', async (req, res) => {
  try {
    const { email, name, rating, comment } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required to edit review' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if email matches (user can only edit their own review)
    if (review.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ message: 'You can only edit your own review' });
    }

    // Update fields
    if (name !== undefined) review.name = name;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = parseInt(rating);
    }
    if (comment !== undefined) review.comment = comment;
    review.updatedAt = new Date();

    await review.save();
    res.json(review);
  } catch (error) {
    console.error('PUT review error:', error);
    res.status(400).json({ message: error.message });
  }
});

// @route   DELETE /api/products/:id/reviews/:reviewId
// @desc    Delete a review (user can delete their own)
router.delete('/:id/reviews/:reviewId', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required to delete review' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if email matches (user can delete their own review)
    if (review.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ message: 'You can only delete your own review' });
    }

    await Review.findByIdAndDelete(req.params.reviewId);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('DELETE review error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products/:id/reviews/:reviewId/reply
// @desc    Reply to a review (admin only)
router.post('/:id/reviews/:reviewId/reply', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { comment } = req.body;
    
    if (!comment) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Add reply
    review.replies.push({
      name: 'Admin',
      comment,
      isAdmin: true
    });

    await review.save();
    res.status(201).json(review);
  } catch (error) {
    console.error('POST reply error:', error);
    res.status(400).json({ message: error.message });
  }
});

export default router;
