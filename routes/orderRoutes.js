import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    console.log('Order POST received:', JSON.stringify(req.body).substring(0, 200));
    
    const orderItems = req.body.orderItems || (req.body.items ? req.body.items.map(item => ({
      name: item.name,
      quantity: item.qty || item.quantity,
      price: item.price,
      size: item.size || '',
      color: item.color || ''
      // Don't set product reference for now - just store name/price/qty
    })) : []);
    
    // Build shipping address with fallbacks for missing fields
    const shippingAddress = {
      street: req.body.shippingAddress?.street || req.body.address || 'Not provided',
      city: req.body.shippingAddress?.city || req.body.city || 'Not provided',
      state: req.body.shippingAddress?.state || req.body.state || 'Not provided',
      zipCode: req.body.shippingAddress?.zipCode || req.body.zipCode || '00000',
      country: req.body.shippingAddress?.country || req.body.country || 'Not provided'
    };

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items', received: req.body });
    }

    // Calculate totals if not provided
    const itemsPrice = req.body.itemsPrice || orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxPrice = req.body.taxPrice || 0;
    const shippingPrice = req.body.shippingPrice || 0;
    const totalPrice = req.body.totalPrice || (itemsPrice + taxPrice + shippingPrice);

    console.log('Creating order with items:', orderItems.length, 'Total:', totalPrice);

    // Create order with minimal required fields (user is optional for demo)
    const order = new Order({
      user: req.body.user || null, // Optional for demo purposes
      orderItems,
      shippingAddress,
      paymentMethod: req.body.paymentMethod || 'card',
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid: false,
      status: 'pending'
    });

    const createdOrder = await order.save();
    console.log('Order created successfully:', createdOrder._id);
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Order creation error:', error.message, error.errors);
    res.status(400).json({ message: error.message, errors: error.errors });
  }
});

// @route   GET /api/orders/:page/:limit
// @desc    Get orders with pagination
router.get('/:page/:limit', async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const limit = parseInt(req.params.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({})
      .populate('user', 'id name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments();

    // Transform orders to match frontend expectations
    const transformedOrders = orders.map(order => ({
      orderID: order._id.toString(),
      _id: order._id.toString(),
      name: order.shippingAddress?.street || 'N/A',
      email: order.user?.email || 'guest@example.com',
      phone: order.shippingAddress?.zipCode || 'N/A',
      address: `${order.shippingAddress?.street}, ${order.shippingAddress?.city}` || 'N/A',
      total: order.totalPrice,
      status: order.status,
      date: order.createdAt,
      items: order.orderItems || [],
      notes: order.notes || ''
    }));

    res.json({
      orders: transformedOrders,
      totalPages: Math.ceil(total / limit),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/orders
// @desc    Get all orders (Admin only)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'id name');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order status and notes
router.put('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true }
    );
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Delete an order
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (order) {
      res.json({ message: 'Order deleted successfully', order });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
