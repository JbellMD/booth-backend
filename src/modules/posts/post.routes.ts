import { Router } from 'express';
import { PostController } from './post.controller';
import { requireAuth, populateUser, requireRole } from '../../middleware/auth';

const router = Router();
const postController = new PostController();

// Public routes
router.get('/:id', (req, res) => postController.getPostById(req, res));
router.get('/', (req, res) => postController.getPosts(req, res));
router.get('/search', (req, res) => postController.searchPosts(req, res));

// Protected routes - require authentication
router.use(requireAuth);
router.use(populateUser);

// Create a new post
router.post('/', (req, res) => postController.createPost(req, res));

// Update a post
router.put('/:id', (req, res) => postController.updatePost(req, res));

// Delete a post
router.delete('/:id', (req, res) => postController.deletePost(req, res));

// Get feed for current user
router.get('/feed', (req, res) => postController.getFeed(req, res));

export default router;
