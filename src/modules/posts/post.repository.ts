import { PrismaClient, Post, ContentType, User } from '@prisma/client';

const prisma = new PrismaClient();

// Type for post creation without ID and timestamps
export type CreatePostInput = {
  userId: string;
  contentType: ContentType;
  textBody?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
};

// Type for post update
export type UpdatePostInput = Partial<Omit<CreatePostInput, 'userId'>>;

// Post with user information
export type PostWithUser = Post & {
  user: User;
};

export class PostRepository {
  /**
   * Create a new post
   */
  async create(data: CreatePostInput): Promise<Post> {
    return prisma.post.create({
      data
    });
  }

  /**
   * Find a post by ID
   */
  async findById(id: string): Promise<PostWithUser | null> {
    return prisma.post.findUnique({
      where: { id },
      include: { user: true }
    });
  }

  /**
   * Update a post
   */
  async update(id: string, data: UpdatePostInput): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a post
   */
  async delete(id: string): Promise<Post> {
    return prisma.post.delete({
      where: { id }
    });
  }

  /**
   * Find all posts with optional pagination and filters
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    userId?: string;
    contentType?: ContentType;
  } = {}): Promise<{ posts: PostWithUser[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      userId,
      contentType
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build where clause based on filters
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (contentType) {
      where.contentType = contentType;
    }
    
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.post.count({ where })
    ]);

    return { posts, total };
  }

  /**
   * Search posts by text content
   */
  async search(query: string, options: {
    page?: number;
    limit?: number;
    contentType?: ContentType;
  } = {}): Promise<{ posts: PostWithUser[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      contentType
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build where clause based on filters and search query
    const where: any = {
      textBody: { contains: query, mode: 'insensitive' }
    };
    
    if (contentType) {
      where.contentType = contentType;
    }
    
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.post.count({ where })
    ]);

    return { posts, total };
  }

  /**
   * Get user's feed (posts from self and others)
   * In a real app, this would include posts from followed users, etc.
   */
  async getFeed(userId: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ posts: PostWithUser[]; total: number }> {
    const {
      page = 1,
      limit = 10
    } = options;
    
    const skip = (page - 1) * limit;
    
    // For MVP, just return all posts ordered by creation date
    // In a real app, this would filter based on user connections
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        skip,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.post.count()
    ]);

    return { posts, total };
  }
}
