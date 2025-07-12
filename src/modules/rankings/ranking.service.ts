import { 
  RankingRepository, 
  CreateRankingInput, 
  UpdateRankingInput, 
  RankingWithCategory,
  RankingSummary 
} from './ranking.repository';
import logger from '../../utils/logger';

export class RankingService {
  private rankingRepository: RankingRepository;

  constructor() {
    this.rankingRepository = new RankingRepository();
  }

  /**
   * Get or create a user ranking
   * If a ranking exists, returns it; otherwise creates a new one
   */
  async getOrCreateRanking(
    userId: string, 
    categoryId: string, 
    defaultScore: number = 0
  ): Promise<RankingWithCategory> {
    try {
      const existingRanking = await this.rankingRepository.findRanking(userId, categoryId);
      
      if (existingRanking) {
        return existingRanking;
      }
      
      return await this.rankingRepository.createRanking({
        userId,
        categoryId,
        score: defaultScore
      });
    } catch (error: any) {
      logger.error(`Error in getOrCreateRanking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a user's ranking
   * Creates the ranking if it doesn't exist
   */
  async updateRanking(
    userId: string, 
    categoryId: string, 
    data: UpdateRankingInput
  ): Promise<RankingWithCategory> {
    try {
      const existingRanking = await this.rankingRepository.findRanking(userId, categoryId);
      
      if (existingRanking) {
        return await this.rankingRepository.updateRanking(userId, categoryId, data);
      } else {
        return await this.rankingRepository.createRanking({
          userId,
          categoryId,
          score: data.score || 0,
          updatedBy: data.updatedBy
        });
      }
    } catch (error: any) {
      logger.error(`Error in updateRanking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adjust a user's ranking by adding to or subtracting from their current score
   */
  async adjustRanking(
    userId: string, 
    categoryId: string, 
    adjustment: number,
    updatedBy?: string
  ): Promise<RankingWithCategory> {
    try {
      const existingRanking = await this.rankingRepository.findRanking(userId, categoryId);
      
      if (existingRanking) {
        const newScore = existingRanking.score + adjustment;
        return await this.rankingRepository.updateRanking(userId, categoryId, {
          score: newScore,
          updatedBy
        });
      } else {
        return await this.rankingRepository.createRanking({
          userId,
          categoryId,
          score: adjustment,
          updatedBy
        });
      }
    } catch (error: any) {
      logger.error(`Error in adjustRanking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all rankings for a user
   */
  async getUserRankings(userId: string): Promise<RankingWithCategory[]> {
    try {
      return await this.rankingRepository.getUserRankings(userId);
    } catch (error: any) {
      logger.error(`Error getting user rankings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user ranking summary
   */
  async getUserRankingSummary(userId: string): Promise<RankingSummary> {
    try {
      return await this.rankingRepository.getUserRankingSummary(userId);
    } catch (error: any) {
      logger.error(`Error getting user ranking summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all ranking categories
   */
  async getCategories() {
    try {
      return await this.rankingRepository.getCategories();
    } catch (error: any) {
      logger.error(`Error getting ranking categories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new ranking category
   * Admin only operation
   */
  async createCategory(name: string, description?: string) {
    try {
      if (!name || name.trim().length === 0) {
        throw new Error('Category name is required');
      }
      
      return await this.rankingRepository.createCategory(name, description);
    } catch (error: any) {
      logger.error(`Error creating ranking category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top ranked users by category
   */
  async getTopUsersByCategory(categoryId: string, limit: number = 10) {
    try {
      return await this.rankingRepository.getTopUsersByCategory(categoryId, limit);
    } catch (error: any) {
      logger.error(`Error getting top users by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top ranked users overall
   */
  async getTopUsers(limit: number = 10) {
    try {
      return await this.rankingRepository.getTopUsers(limit);
    } catch (error: any) {
      logger.error(`Error getting top users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply ranking based on completed order
   * Used to adjust seller ratings when orders are completed
   */
  async applyOrderCompletionRanking(
    sellerId: string,
    buyerId: string,
    orderValue: number,
    wasSuccessful: boolean = true
  ) {
    try {
      // Adjust seller's sales ranking
      const salesCategoryId = 'sales'; // This would be the actual ID from your DB
      const salesAdjustment = wasSuccessful ? orderValue * 0.1 : -orderValue * 0.05;
      
      await this.adjustRanking(sellerId, salesCategoryId, salesAdjustment, buyerId);
      
      // Adjust seller's reputation
      const repCategoryId = 'reputation'; // This would be the actual ID from your DB
      const repAdjustment = wasSuccessful ? 5 : -10;
      
      await this.adjustRanking(sellerId, repCategoryId, repAdjustment, buyerId);
      
      logger.info(`Applied order completion ranking for seller ${sellerId}`);
    } catch (error: any) {
      logger.error(`Error applying order completion ranking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply ranking based on post engagement
   * Used to adjust user reputation when their posts receive likes, comments, etc.
   */
  async applyPostEngagementRanking(
    userId: string,
    engagementType: 'like' | 'comment' | 'share',
    engagementValue: number = 1
  ) {
    try {
      // Adjust content creator ranking
      const contentCategoryId = 'content'; // This would be the actual ID from your DB
      
      let adjustment = 0;
      switch (engagementType) {
        case 'like':
          adjustment = 1 * engagementValue;
          break;
        case 'comment':
          adjustment = 3 * engagementValue;
          break;
        case 'share':
          adjustment = 5 * engagementValue;
          break;
      }
      
      await this.adjustRanking(userId, contentCategoryId, adjustment);
      logger.info(`Applied post engagement ranking for user ${userId}`);
    } catch (error: any) {
      logger.error(`Error applying post engagement ranking: ${error.message}`);
      throw error;
    }
  }
}
