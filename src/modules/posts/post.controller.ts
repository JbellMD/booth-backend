import { Request, Response } from 'express';
import { PostService } from './post.service';
import { z } from 'zod';
import { ContentType } from '@prisma/client';
import logger from '../../utils/logger';

// Validation schemas
const postCreateSchema = z.object({
  contentType: z.enum(['text', 'image', 'video']),
  textBody: z.string().max(5000).optional(),
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});

const postUpdateSchema = z.object({
  textBody: z.string().max(5000).optional(),
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export class PostController {
  private postService: PostService;

  constructor() {
    this.postService = new PostService();
  }

  /**
   * Create a new post
   */
  async createPost(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Validate request body
      const validationResult = postCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Create post with current user ID
      const post = await this.postService.createPost({
        ...validationResult.data,
        userId: req.user.id
      });
      
      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: post
      });
    } catch (error: any) {
      logger.error(`Error in createPost: ${error.message}`);
      
      if (error.message.includes('require')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Server error',
          error: error.message
        });
      }
    }
  }

  /**
   * Get post by ID
   */
  async getPostById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const post = await this.postService.getPostById(id);
      
      if (!post) {
        res.status(404).json({
          success: false,
          message: 'Post not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: post
      });
    } catch (error: any) {
      logger.error(`Error in getPostById: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Update a post
   */
  async updatePost(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      
      // Validate request body
      const validationResult = postUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Update post
      try {
        const post = await this.postService.updatePost(
          id,
          req.user.id,
          validationResult.data
        );
        
        res.status(200).json({
          success: true,
          message: 'Post updated successfully',
          data: post
        });
      } catch (error: any) {
        if (error.message === 'Post not found') {
          res.status(404).json({
            success: false,
            message: 'Post not found'
          });
        } else if (error.message === 'You can only update your own posts') {
          res.status(403).json({
            success: false,
            message: 'You can only update your own posts'
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error(`Error in updatePost: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Delete a post
   */
  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const isAdmin = req.user.role === 'Admin';
      
      try {
        await this.postService.deletePost(id, req.user.id, isAdmin);
        
        res.status(200).json({
          success: true,
          message: 'Post deleted successfully'
        });
      } catch (error: any) {
        if (error.message === 'Post not found') {
          res.status(404).json({
            success: false,
            message: 'Post not found'
          });
        } else if (error.message === 'You can only delete your own posts') {
          res.status(403).json({
            success: false,
            message: 'You can only delete your own posts'
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error(`Error in deletePost: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get feed for current user
   */
  async getFeed(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      
      // Get feed posts
      const result = await this.postService.getFeed(req.user.id, { page, limit });
      
      res.status(200).json({
        success: true,
        data: result.posts,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getFeed: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get posts with filtering
   */
  async getPosts(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const userId = req.query.userId as string;
      const contentType = req.query.contentType as ContentType | undefined;
      
      // Get posts with filters
      const result = await this.postService.getAllPosts({
        page,
        limit,
        userId,
        contentType
      });
      
      res.status(200).json({
        success: true,
        data: result.posts,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getPosts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Search posts
   */
  async searchPosts(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const contentType = req.query.contentType as ContentType | undefined;
      
      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }
      
      // Search posts
      const result = await this.postService.searchPosts(query, {
        page,
        limit,
        contentType
      });
      
      res.status(200).json({
        success: true,
        data: result.posts,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in searchPosts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
}
