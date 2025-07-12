import { Router } from 'express';
import { EngagementController } from './engagement.controller';
import { requireAuth, populateUser } from '../../middleware/auth';

const router = Router();
const engagementController = new EngagementController();

// Public routes for retrieving engagement data
router.get('/content/:contentId/counts', (req, res) => engagementController.getEngagementCounts(req, res));
router.get('/content/:contentId/likes', (req, res) => engagementController.getLikes(req, res));
router.get('/content/:contentId/comments', (req, res) => engagementController.getComments(req, res));
router.get('/content/:contentId/shares', (req, res) => engagementController.getShares(req, res));
router.get('/comments/:commentId/replies', (req, res) => engagementController.getCommentReplies(req, res));

// Protected routes that require authentication
router.use(requireAuth);
router.use(populateUser);

// Check if current user has liked content
router.get('/content/:contentId/hasLiked', (req, res) => engagementController.hasUserLiked(req, res));

// Create engagement
router.post('/content/:contentId/type/:contentType/like', (req, res) => engagementController.likeContent(req, res));
router.delete('/content/:contentId/like', (req, res) => engagementController.unlikeContent(req, res));
router.post('/content/:contentId/type/:contentType/comment', (req, res) => engagementController.addComment(req, res));
router.post('/content/:contentId/type/:contentType/share', (req, res) => engagementController.shareContent(req, res));

// Delete comment
router.delete('/comments/:commentId', (req, res) => engagementController.deleteComment(req, res));

export default router;
