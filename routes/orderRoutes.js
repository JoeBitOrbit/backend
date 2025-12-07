import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// Helper: Normalize order items from various formats
const normalizeOrderItems = (items) => {
  if (!Array.isArray(items)) return [];
  
  return items.map(item => {
    if (!item || typeof item !== 'object') return null;
    return {
      name: item.name || item.productName || 'Unknown Product',
      quantity: Math.max(1, parseInt(item.qty || item.quantity || 1)),
      price: parseFloat(item.price || 0),
      size: item.size || '',
      color: item.color || '',
      productId: item.productId || item.id || ''
    };
  }).filter(item => item !== null);
};

// Helper: Build shipping address
const buildShippingAddress = (body) => ({
  street: body.shippingAddress?.street || body.address || 'Not provided',
  city: body.shippingAddress?.city || body.city || 'Not provided',
  state: body.shippingAddress?.state || body.state || 'Not provided',
  zipCode: body.shippingAddress?.zipCode || body.zipCode || 'Not provided',
  country: body.shippingAddress?.country || body.country || 'Sri Lanka',
  phone: body.phone || body.shippingAddress?.phone || 'Not provided'
});

// Helper: Calculate totals
const calculateTotals = (items) => {
  const itemsPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxPrice = 0; // No tax for now
  const shippingPrice = itemsPrice > 100 ? 0 : 10; // Free shipping over 100
  return {
    itemsPrice: parseFloat(itemsPrice.toFixed(2)),
    taxPrice: parseFloat(taxPrice.toFixed(2)),
    shippingPrice: parseFloat(shippingPrice.toFixed(2)),
    totalPrice: parseFloat((itemsPrice + taxPrice + shippingPrice).toFixed(2))
  };
};

// CREATE ORDER
router.post('/', async (req, res) => {
  try {
    // Extract and normalize items
    const rawItems = req.body.items || req.body.orderItems || req.body.order?.items || [];
    const orderItems = normalizeOrderItems(rawItems);

    // Validate items exist
    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please add items to your cart before checkout'
      });
    }

    // Build address and calculate totals
    const shippingAddress = buildShippingAddress(req.body);
    const totals = calculateTotals(orderItems);

    // Create order
    const order = new Order({
      user: req.body.user || null,
      orderItems,
      shippingAddress,
      paymentMethod: req.body.paymentMethod || 'card',
      ...totals,
      isPaid: false,
      paidAt: null,
      status: 'pending',
      notes: req.body.notes || ''
    });

    const savedOrder = await order.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: savedOrder
    });

  } catch (error) {
    console.error('Order creation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// GET ALL ORDERS WITH PAGINATION
router.get('/page/:pageNum', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.params.pageNum) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({})
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments()
    ]);

    const transformedOrders = orders.map(order => ({
      _id: order._id,
      orderID: order._id.toString(),
      customerName: order.shippingAddress?.street || 'Guest',
      email: order.user?.email || 'guest@example.com',
      phone: order.shippingAddress?.phone || 'N/A',
      address: `${order.shippingAddress?.street}, ${order.shippingAddress?.city}`,
      totalPrice: order.totalPrice,
      status: order.status,
      date: order.createdAt,
      itemCount: order.orderItems?.length || 0,
      isPaid: order.isPaid
    }));

    res.json({
      success: true,
      orders: transformedOrders,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: orders.length,
        totalRecords: total
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET ORDER BY ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET ALL ORDERS (NO PAGINATION)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// UPDATE ORDER
router.put('/:id', async (req, res) => {
  try {
    const { status, notes, isPaid } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (isPaid !== undefined) {
      updateData.isPaid = isPaid;
      if (isPaid) updateData.paidAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE ORDER
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
