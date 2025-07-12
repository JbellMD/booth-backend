import { Engagement, EngagementType } from '@prisma/client';
import { 
  EngagementRepository, 
  CreateEngagementInput,
  EngagementWithUser,
  EngagementCount
} from './engagement.repository';
import { RankingService } from '../rankings/ranking.service';
import logger from '../../utils/logger';

export class EngagementService {
  private engagementRepository: EngagementRepository;
  private rankingService: RankingService;

  constructor() {
    this.engagementRepository = new EngagementRepository();
    this.rankingService = new RankingService();
  }

  /**
   * Create a like engagement
   */
  async createLike(
    userId: string,
    contentId: string,
    contentType: string,
    contentOwnerId?: string
  ): Promise<Engagement> {
    try {
      // Check if user already liked the content
      const existingLike = await this.engagementRepository.findUserEngagement(
        userId,
        contentId,
        'Like'
      );
      
      if (existingLike) {
        throw new Error('User has already liked this content');
      }
      
      // Create the like
      const like = await this.engagementRepository.create({
        userId,
        contentId,
        contentType,
        type: 'Like'
      });
      
      // If we know the content owner, update their ranking
      if (contentOwnerId && contentOwnerId !== userId) {
        try {
          await this.rankingService.applyPostEngagementRanking(
            contentOwnerId,
            'like',
            1
          );
        } catch (error) {
          // Log but don't fail the like operation if ranking update fails
          logger.error(`Failed to update ranking for like: ${error}`);
        }
      }
      
      return like;
    } catch (error: any) {
      logger.error(`Error creating like: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a like engagement
   */
  async removeLike(userId: string, contentId: string, contentOwnerId?: string): Promise<void> {
    try {
      // Find the existing like
      const existingLike = await this.engagementRepository.findUserEngagement(
        userId,
        contentId,
        'Like'
      );
      
      if (!existingLike) {
        throw new Error('Like not found');
      }
      
      // Delete the like
      await this.engagementRepository.delete(existingLike.id);
      
      // If we know the content owner, update their ranking (negative adjustment)
      if (contentOwnerId && contentOwnerId !== userId) {
        try {
          await this.rankingService.applyPostEngagementRanking(
            contentOwnerId,
            'like',
            -1
          );
        } catch (error) {
          // Log but don't fail if ranking update fails
          logger.error(`Failed to update ranking for like removal: ${error}`);
        }
      }
    } catch (error: any) {
      logger.error(`Error removing like: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a comment
   */
  async createComment(
    userId: string,
    contentId: string,
    contentType: string,
    comment: string,
    parentId?: string,
    contentOwnerId?: string
  ): Promise<Engagement> {
    try {
      // Validate comment
      if (!comment || comment.trim().length === 0) {
        throw new Error('Comment content is required');
      }
      
      // Create the comment
      const engagement = await this.engagementRepository.create({
        userId,
        contentId,
        contentType,
        type: 'Comment',
        comment,
        parentId
      });
      
      // If we know the content owner, update their ranking
      if (contentOwnerId && contentOwnerId !== userId) {
        try {
          await this.rankingService.applyPostEngagementRanking(
            contentOwnerId,
            'comment',
            1
          );
        } catch (error) {
          // Log but don't fail the comment operation if ranking update fails
          logger.error(`Failed to update ranking for comment: ${error}`);
        }
      }
      
      return engagement;
    } catch (error: any) {
      logger.error(`Error creating comment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(
    commentId: string, 
    userId: string,
    isAdmin: boolean = false,
    contentOwnerId?: string
  ): Promise<Engagement> {
    try {
      // Get the comment
      const comment = await this.engagementRepository.findById(commentId);
      
      if (!comment) {
        throw new Error('Comment not found');
      }
      
      // Check authorization
      if (!isAdmin && comment.userId !== userId) {
        throw new Error('You are not authorized to delete this comment');
      }
      
      // Delete the comment
      const deletedComment = await this.engagementRepository.delete(commentId);
      
      // If we know the content owner, update their ranking (negative adjustment)
      if (contentOwnerId && contentOwnerId !== userId) {
        try {
          await this.rankingService.applyPostEngagementRanking(
            contentOwnerId,
            'comment',
            -1
          );
        } catch (error) {
          // Log but don't fail if ranking update fails
          logger.error(`Failed to update ranking for comment deletion: ${error}`);
        }
      }
      
      return deletedComment;
    } catch (error: any) {
      logger.error(`Error deleting comment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a share
   */
  async createShare(
    userId: string,
    contentId: string,
    contentType: string,
    contentOwnerId?: string
  ): Promise<Engagement> {
    try {
      // Create the share
      const share = await this.engagementRepository.create({
        userId,
        contentId,
        contentType,
        type: 'Share'
      });
      
      // If we know the content owner, update their ranking
      if (contentOwnerId && contentOwnerId !== userId) {
        try {
          await this.rankingService.applyPostEngagementRanking(
            contentOwnerId,
            'share',
            1
          );
        } catch (error) {
          // Log but don't fail the share operation if ranking update fails
          logger.error(`Failed to update ranking for share: ${error}`);
        }
      }
      
      return share;
    } catch (error: any) {
      logger.error(`Error creating share: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get engagement counts for content
   */
  async getEngagementCounts(contentId: string): Promise<EngagementCount> {
    try {
      return await this.engagementRepository.countEngagements(contentId);
    } catch (error: any) {
      logger.error(`Error getting engagement counts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a user has liked content
   */
  async hasUserLiked(userId: string, contentId: string): Promise<boolean> {
    try {
      const like = await this.engagementRepository.findUserEngagement(
        userId,
        contentId,
        'Like'
      );
      
      return !!like;
    } catch (error: any) {
      logger.error(`Error checking if user liked content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get likes for content
   */
  async getLikes(
    contentId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ likes: EngagementWithUser[]; total: number }> {
    try {
      return await this.engagementRepository.getLikes(contentId, options);
    } catch (error: any) {
      logger.error(`Error getting likes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comments for content
   */
  async getComments(
    contentId: string,
    options: {
      page?: number;
      limit?: number;
      parentId?: string | null;
    } = {}
  ): Promise<{ comments: EngagementWithUser[]; total: number }> {
    try {
      return await this.engagementRepository.getComments(contentId, options);
    } catch (error: any) {
      logger.error(`Error getting comments: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get replies to a comment
   */
  async getCommentReplies(
    commentId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ replies: EngagementWithUser[]; total: number }> {
    try {
      return await this.engagementRepository.getCommentReplies(commentId, options);
    } catch (error: any) {
      logger.error(`Error getting comment replies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shares for content
   */
  async getShares(
    contentId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ shares: EngagementWithUser[]; total: number }> {
    try {
      return await this.engagementRepository.getShares(contentId, options);
    } catch (error: any) {
      logger.error(`Error getting shares: ${error.message}`);
      throw error;
    }
  }
}
