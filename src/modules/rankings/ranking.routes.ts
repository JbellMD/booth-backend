import { Router } from 'express';
import { RankingController } from './ranking.controller';
import { requireAuth, populateUser, requireRole } from '../../middleware/auth';

const router = Router();
const rankingController = new RankingController();

// Public routes
router.get('/categories', (req, res) => rankingController.getCategories(req, res));
router.get('/top', (req, res) => rankingController.getTopUsers(req, res));
router.get('/top/category/:categoryId', (req, res) => rankingController.getTopUsersByCategory(req, res));
router.get('/user/:userId', (req, res) => rankingController.getUserRankingSummary(req, res));

// Protected routes
router.use(requireAuth);
router.use(populateUser);

// Get current user's rankings
router.get('/my', (req, res) => rankingController.getMyRankings(req, res));

// Admin-only routes
router.post('/categories', requireRole('Admin'), (req, res) => rankingController.createCategory(req, res));
router.put('/user/:userId/category/:categoryId', requireRole('Admin'), (req, res) => rankingController.updateUserRanking(req, res));

export default router;
