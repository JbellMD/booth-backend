import { Request, Response } from 'express';
import { z } from 'zod';
import { EngagementService } from './engagement.service';
import logger from '../../utils/logger';

// Validation schemas
const commentSchema = z.object({
  comment: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional()
});

export class EngagementController {
  private engagementService: EngagementService;

  constructor() {
    this.engagementService = new EngagementService();
  }

  /**
   * Like content
   */
  async likeContent(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { contentId, contentType } = req.params;
      const contentOwnerId = req.body.contentOwnerId; // Optional
      
      const like = await this.engagementService.createLike(
        req.user.id,
        contentId,
        contentType,
        contentOwnerId
      );
      
      res.status(201).json({
        success: true,
        message: 'Content liked successfully',
        data: like
      });
    } catch (error: any) {
      logger.error(`Error in likeContent: ${error.message}`);
      
      if (error.message === 'User has already liked this content') {
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
   * Unlike content
   */
  async unlikeContent(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { contentId } = req.params;
      const contentOwnerId = req.body.contentOwnerId; // Optional
      
      await this.engagementService.removeLike(
        req.user.id,
        contentId,
        contentOwnerId
      );
      
      res.status(200).json({
        success: true,
        message: 'Like removed successfully'
      });
    } catch (error: any) {
      logger.error(`Error in unlikeContent: ${error.message}`);
      
      if (error.message === 'Like not found') {
        res.status(404).json({
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
   * Add a comment to content
   */
  async addComment(req: Request, res: Response): Promise<void> {
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
      const validationResult = commentSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      const { contentId, contentType } = req.params;
      const { comment, parentId } = validationResult.data;
      const contentOwnerId = req.body.contentOwnerId; // Optional
      
      const newComment = await this.engagementService.createComment(
        req.user.id,
        contentId,
        contentType,
        comment,
        parentId,
        contentOwnerId
      );
      
      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: newComment
      });
    } catch (error: any) {
      logger.error(`Error in addComment: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { commentId } = req.params;
      const isAdmin = req.user.role === 'Admin';
      const contentOwnerId = req.body.contentOwnerId; // Optional
      
      await this.engagementService.deleteComment(
        commentId,
        req.user.id,
        isAdmin,
        contentOwnerId
      );
      
      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error: any) {
      logger.error(`Error in deleteComment: ${error.message}`);
      
      if (error.message === 'Comment not found') {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message === 'You are not authorized to delete this comment') {
        res.status(403).json({
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
   * Share content
   */
  async shareContent(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { contentId, contentType } = req.params;
      const contentOwnerId = req.body.contentOwnerId; // Optional
      
      const share = await this.engagementService.createShare(
        req.user.id,
        contentId,
        contentType,
        contentOwnerId
      );
      
      res.status(201).json({
        success: true,
        message: 'Content shared successfully',
        data: share
      });
    } catch (error: any) {
      logger.error(`Error in shareContent: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get engagement counts for content
   */
  async getEngagementCounts(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      const counts = await this.engagementService.getEngagementCounts(contentId);
      
      res.status(200).json({
        success: true,
        data: counts
      });
    } catch (error: any) {
      logger.error(`Error in getEngagementCounts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Check if user has liked content
   */
  async hasUserLiked(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { contentId } = req.params;
      const hasLiked = await this.engagementService.hasUserLiked(
        req.user.id,
        contentId
      );
      
      res.status(200).json({
        success: true,
        data: { hasLiked }
      });
    } catch (error: any) {
      logger.error(`Error in hasUserLiked: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get likes for content
   */
  async getLikes(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      
      const result = await this.engagementService.getLikes(contentId, { page, limit });
      
      res.status(200).json({
        success: true,
        data: result.likes,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getLikes: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get comments for content
   */
  async getComments(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      
      // Parse pagination and filter parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      const parentId = req.query.parentId as string || null;
      
      const result = await this.engagementService.getComments(contentId, {
        page,
        limit,
        parentId
      });
      
      res.status(200).json({
        success: true,
        data: result.comments,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getComments: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get replies to a comment
   */
  async getCommentReplies(req: Request, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      
      const result = await this.engagementService.getCommentReplies(commentId, {
        page,
        limit
      });
      
      res.status(200).json({
        success: true,
        data: result.replies,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getCommentReplies: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get shares for content
   */
  async getShares(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      
      const result = await this.engagementService.getShares(contentId, {
        page,
        limit
      });
      
      res.status(200).json({
        success: true,
        data: result.shares,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getShares: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
}
