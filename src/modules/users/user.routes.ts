import { Router } from 'express';
import { UserController } from './user.controller';
import { requireAuth, populateUser, requireRole, requireSelf, requireSelfOrAdmin } from '../../middleware/auth';

const router = Router();
const userController = new UserController();

// Public routes - None for users module

// Protected routes - require authentication
router.use(requireAuth);
router.use(populateUser);

// Get current user profile
router.get('/me', (req, res) => userController.getCurrentUser(req, res));

// Update current user profile
router.put('/update', (req, res) => userController.updateUser(req, res));

// Get user by ID (public profile)
router.get('/:id', (req, res) => userController.getUserById(req, res));

// Search users
router.get('/search', (req, res) => userController.searchUsers(req, res));

// Admin-only routes
router.get('/', requireRole('Admin'), (req, res) => userController.getAllUsers(req, res));
router.post('/', requireRole('Admin'), (req, res) => userController.createUser(req, res));
router.delete('/:id', requireRole('Admin'), (req, res) => userController.deleteUser(req, res));

export default router;
