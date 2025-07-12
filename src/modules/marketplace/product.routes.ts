import { Router } from 'express';
import { ProductController } from './product.controller';
import { requireAuth, populateUser, requireRole } from '../../middleware/auth';

const router = Router();
const productController = new ProductController();

// Public routes
router.get('/', (req, res) => productController.getProducts(req, res));
router.get('/categories', (req, res) => productController.getCategories(req, res));
router.get('/search', (req, res) => productController.searchProducts(req, res));
router.get('/:id', (req, res) => productController.getProductById(req, res));

// Protected routes - require authentication
router.use(requireAuth);
router.use(populateUser);

// Create a new product
router.post('/', (req, res) => productController.createProduct(req, res));

// Update a product
router.put('/:id', (req, res) => productController.updateProduct(req, res));

// Delete a product
router.delete('/:id', (req, res) => productController.deleteProduct(req, res));

export default router;
