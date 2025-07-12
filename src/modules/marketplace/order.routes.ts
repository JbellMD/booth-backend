import { Router } from 'express';
import { OrderController } from './order.controller';
import { requireAuth, populateUser, requireRole } from '../../middleware/auth';

const router = Router();
const orderController = new OrderController();

// All order routes require authentication
router.use(requireAuth);
router.use(populateUser);

// Create a new order
router.post('/', (req, res) => orderController.createOrder(req, res));

// Get order by ID
router.get('/:id', (req, res) => orderController.getOrderById(req, res));

// Get user's orders (as buyer)
router.get('/my/purchases', (req, res) => orderController.getMyOrders(req, res));

// Get user's orders (as seller)
router.get('/my/sales', (req, res) => orderController.getSellerOrders(req, res));

// Get user's buyer statistics
router.get('/my/buyer-stats', (req, res) => orderController.getBuyerStats(req, res));

// Get user's seller statistics
router.get('/my/seller-stats', (req, res) => orderController.getSellerStats(req, res));

// Update order details
router.put('/:id', (req, res) => orderController.updateOrder(req, res));

// Update order status
router.patch('/:id/status', (req, res) => orderController.updateOrderStatus(req, res));

// Cancel an order
router.post('/:id/cancel', (req, res) => orderController.cancelOrder(req, res));

// Admin-only routes
router.get('/', requireRole('Admin'), (req, res) => orderController.getAllOrders(req, res));
router.get('/stats/seller/:id', requireRole('Admin'), (req, res) => orderController.getSellerStats(req, res));
router.get('/stats/buyer/:id', requireRole('Admin'), (req, res) => orderController.getBuyerStats(req, res));

export default router;
