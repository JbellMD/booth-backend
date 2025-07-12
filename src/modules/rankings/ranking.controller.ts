import { Request, Response } from 'express';
import { z } from 'zod';
import { RankingService } from './ranking.service';
import logger from '../../utils/logger';

// Validation schemas
const rankingUpdateSchema = z.object({
  score: z.number().optional(),
  adjustment: z.number().optional()
});

const categoryCreateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional()
});

export class RankingController {
  private rankingService: RankingService;

  constructor() {
    this.rankingService = new RankingService();
  }

  /**
   * Get all ranking categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.rankingService.getCategories();
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      logger.error(`Error in getCategories: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Create a new ranking category (admin only)
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = categoryCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      const { name, description } = validationResult.data;
      const category = await this.rankingService.createCategory(name, description);
      
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error: any) {
      logger.error(`Error in createCategory: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get a user's ranking summary
   */
  async getUserRankingSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const summary = await this.rankingService.getUserRankingSummary(userId);
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      logger.error(`Error in getUserRankingSummary: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get current user's ranking summary
   */
  async getMyRankings(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const summary = await this.rankingService.getUserRankingSummary(req.user.id);
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      logger.error(`Error in getMyRankings: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Update a user's ranking in a specific category
   */
  async updateUserRanking(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated as admin
      if (!req.user?.id || req.user.role !== 'Admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      const { userId, categoryId } = req.params;
      
      // Validate request body
      const validationResult = rankingUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      let updatedRanking;
      
      if (validationResult.data.adjustment !== undefined) {
        // Adjust the ranking
        updatedRanking = await this.rankingService.adjustRanking(
          userId,
          categoryId,
          validationResult.data.adjustment,
          req.user.id
        );
      } else if (validationResult.data.score !== undefined) {
        // Set the ranking to a specific score
        updatedRanking = await this.rankingService.updateRanking(
          userId,
          categoryId,
          {
            score: validationResult.data.score,
            updatedBy: req.user.id
          }
        );
      } else {
        res.status(400).json({
          success: false,
          message: 'Either score or adjustment must be provided'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Ranking updated successfully',
        data: updatedRanking
      });
    } catch (error: any) {
      logger.error(`Error in updateUserRanking: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get top ranked users by category
   */
  async getTopUsersByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId } = req.params;
      const limit = parseInt(req.query.limit as string || '10');
      
      const users = await this.rankingService.getTopUsersByCategory(categoryId, limit);
      
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error: any) {
      logger.error(`Error in getTopUsersByCategory: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get top ranked users overall
   */
  async getTopUsers(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string || '10');
      
      const users = await this.rankingService.getTopUsers(limit);
      
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error: any) {
      logger.error(`Error in getTopUsers: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
}
