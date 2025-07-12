import { PrismaClient, UserRanking, RankingCategory } from '@prisma/client';

const prisma = new PrismaClient();

// Type for creating a ranking
export type CreateRankingInput = {
  userId: string;
  categoryId: string;
  score: number;
  updatedBy?: string;
};

// Type for updating a ranking
export type UpdateRankingInput = Partial<Pick<CreateRankingInput, 'score' | 'updatedBy'>>;

// Type for ranking with category
export type RankingWithCategory = UserRanking & {
  category: RankingCategory;
};

// Type for rankings summary
export type RankingSummary = {
  userId: string;
  totalScore: number;
  rankingCount: number;
  averageScore: number;
  rankings: RankingWithCategory[];
};

export class RankingRepository {
  /**
   * Find a ranking by user ID and category ID
   */
  async findRanking(userId: string, categoryId: string): Promise<RankingWithCategory | null> {
    return prisma.userRanking.findUnique({
      where: {
        userId_categoryId: {
          userId,
          categoryId
        }
      },
      include: {
        category: true
      }
    });
  }

  /**
   * Create a new ranking
   */
  async createRanking(data: CreateRankingInput): Promise<RankingWithCategory> {
    return prisma.userRanking.create({
      data: {
        userId: data.userId,
        categoryId: data.categoryId,
        score: data.score,
        updatedBy: data.updatedBy || data.userId
      },
      include: {
        category: true
      }
    });
  }

  /**
   * Update an existing ranking
   */
  async updateRanking(
    userId: string,
    categoryId: string,
    data: UpdateRankingInput
  ): Promise<RankingWithCategory> {
    return prisma.userRanking.update({
      where: {
        userId_categoryId: {
          userId,
          categoryId
        }
      },
      data,
      include: {
        category: true
      }
    });
  }

  /**
   * Delete a ranking
   */
  async deleteRanking(userId: string, categoryId: string): Promise<UserRanking> {
    return prisma.userRanking.delete({
      where: {
        userId_categoryId: {
          userId,
          categoryId
        }
      }
    });
  }

  /**
   * Get all rankings for a user
   */
  async getUserRankings(userId: string): Promise<RankingWithCategory[]> {
    return prisma.userRanking.findMany({
      where: { userId },
      include: {
        category: true
      },
      orderBy: {
        score: 'desc'
      }
    });
  }

  /**
   * Get all ranking categories
   */
  async getCategories(): Promise<RankingCategory[]> {
    return prisma.rankingCategory.findMany({
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * Create a new ranking category
   */
  async createCategory(name: string, description?: string): Promise<RankingCategory> {
    return prisma.rankingCategory.create({
      data: {
        name,
        description
      }
    });
  }

  /**
   * Get user ranking summary
   */
  async getUserRankingSummary(userId: string): Promise<RankingSummary> {
    const rankings = await this.getUserRankings(userId);
    
    const totalScore = rankings.reduce((sum, ranking) => sum + ranking.score, 0);
    const rankingCount = rankings.length;
    const averageScore = rankingCount > 0 ? totalScore / rankingCount : 0;
    
    return {
      userId,
      totalScore,
      rankingCount,
      averageScore,
      rankings
    };
  }

  /**
   * Get top ranked users by category
   */
  async getTopUsersByCategory(
    categoryId: string,
    limit: number = 10
  ): Promise<UserRanking[]> {
    return prisma.userRanking.findMany({
      where: { categoryId },
      orderBy: {
        score: 'desc'
      },
      take: limit,
      include: {
        user: true,
        category: true
      }
    });
  }

  /**
   * Get top ranked users across all categories
   */
  async getTopUsers(limit: number = 10): Promise<any[]> {
    // This requires a more complex query to aggregate scores across categories
    const topUsers = await prisma.$queryRaw<
      { userId: string; totalScore: number }[]
    >`
      SELECT "userId", SUM(score) as "totalScore"
      FROM "UserRanking"
      GROUP BY "userId"
      ORDER BY "totalScore" DESC
      LIMIT ${limit}
    `;

    // Get detailed user info for each top user
    const detailedUsers = await Promise.all(
      topUsers.map(async (user) => {
        const userDetails = await prisma.user.findUnique({
          where: { id: user.userId },
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            username: true
          }
        });

        const rankings = await this.getUserRankings(user.userId);

        return {
          ...userDetails,
          totalScore: user.totalScore,
          rankings
        };
      })
    );

    return detailedUsers;
  }
}
