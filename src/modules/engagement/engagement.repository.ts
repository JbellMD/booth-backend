import { PrismaClient, Engagement, EngagementType } from '@prisma/client';

const prisma = new PrismaClient();

// Types for engagement operations
export type CreateEngagementInput = {
  userId: string;
  contentId: string; // This could be a post ID, product ID, etc.
  contentType: string; // e.g., 'Post', 'Product', 'Comment', etc.
  type: EngagementType; // 'Like', 'Comment', 'Share', etc.
  comment?: string; // Optional comment content
  parentId?: string; // For nested comments
};

export type EngagementWithUser = Engagement & {
  user: {
    id: string;
    name: string;
    username: string;
    profileImage?: string;
  };
};

export type EngagementCount = {
  likes: number;
  comments: number;
  shares: number;
  total: number;
};

export class EngagementRepository {
  /**
   * Create a new engagement
   */
  async create(data: CreateEngagementInput): Promise<Engagement> {
    return prisma.engagement.create({
      data: {
        userId: data.userId,
        contentId: data.contentId,
        contentType: data.contentType,
        type: data.type,
        comment: data.comment,
        parentId: data.parentId
      }
    });
  }

  /**
   * Find engagement by ID
   */
  async findById(id: string): Promise<Engagement | null> {
    return prisma.engagement.findUnique({
      where: { id }
    });
  }

  /**
   * Delete an engagement
   */
  async delete(id: string): Promise<Engagement> {
    return prisma.engagement.delete({
      where: { id }
    });
  }

  /**
   * Find a user's engagement with content
   */
  async findUserEngagement(
    userId: string,
    contentId: string,
    type: EngagementType
  ): Promise<Engagement | null> {
    return prisma.engagement.findFirst({
      where: {
        userId,
        contentId,
        type
      }
    });
  }

  /**
   * Count engagements for content
   */
  async countEngagements(contentId: string): Promise<EngagementCount> {
    const counts = await prisma.engagement.groupBy({
      by: ['type'],
      where: {
        contentId
      },
      _count: {
        id: true
      }
    });

    // Initialize counts
    let result: EngagementCount = {
      likes: 0,
      comments: 0,
      shares: 0,
      total: 0
    };

    // Process the group by results
    counts.forEach(count => {
      switch (count.type) {
        case 'Like':
          result.likes = count._count.id;
          break;
        case 'Comment':
          result.comments = count._count.id;
          break;
        case 'Share':
          result.shares = count._count.id;
          break;
      }
    });

    // Calculate total
    result.total = result.likes + result.comments + result.shares;

    return result;
  }

  /**
   * Get all likes for content
   */
  async getLikes(
    contentId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ likes: EngagementWithUser[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      prisma.engagement.findMany({
        where: {
          contentId,
          type: 'Like'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              profileImage: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.engagement.count({
        where: {
          contentId,
          type: 'Like'
        }
      })
    ]);

    return { likes, total };
  }

  /**
   * Get all comments for content
   */
  async getComments(
    contentId: string,
    options: {
      page?: number;
      limit?: number;
      parentId?: string | null;
    } = {}
  ): Promise<{ comments: EngagementWithUser[]; total: number }> {
    const { page = 1, limit = 20, parentId = null } = options;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.engagement.findMany({
        where: {
          contentId,
          type: 'Comment',
          parentId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              profileImage: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.engagement.count({
        where: {
          contentId,
          type: 'Comment',
          parentId
        }
      })
    ]);

    return { comments, total };
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
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [replies, total] = await Promise.all([
      prisma.engagement.findMany({
        where: {
          parentId: commentId,
          type: 'Comment'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              profileImage: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.engagement.count({
        where: {
          parentId: commentId,
          type: 'Comment'
        }
      })
    ]);

    return { replies, total };
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
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [shares, total] = await Promise.all([
      prisma.engagement.findMany({
        where: {
          contentId,
          type: 'Share'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              profileImage: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.engagement.count({
        where: {
          contentId,
          type: 'Share'
        }
      })
    ]);

    return { shares, total };
  }
}
