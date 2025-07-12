import { Post, ContentType } from '@prisma/client';
import { PostRepository, CreatePostInput, UpdatePostInput, PostWithUser } from './post.repository';
import logger from '../../utils/logger';

export class PostService {
  private postRepository: PostRepository;

  constructor() {
    this.postRepository = new PostRepository();
  }

  /**
   * Create a new post
   */
  async createPost(postData: CreatePostInput): Promise<Post> {
    try {
      // Validate post data
      this.validatePostData(postData);
      
      return await this.postRepository.create(postData);
    } catch (error: any) {
      logger.error(`Error creating post: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a post by ID
   */
  async getPostById(postId: string): Promise<PostWithUser | null> {
    try {
      return await this.postRepository.findById(postId);
    } catch (error: any) {
      logger.error(`Error fetching post by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a post
   */
  async updatePost(postId: string, userId: string, updateData: UpdatePostInput): Promise<Post> {
    try {
      // Check if post exists and belongs to the user
      const post = await this.postRepository.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      if (post.userId !== userId) {
        throw new Error('You can only update your own posts');
      }
      
      // Validate update data
      if (Object.keys(updateData).length > 0) {
        this.validatePostData({ ...updateData, userId: post.userId, contentType: post.contentType });
      }
      
      return await this.postRepository.update(postId, updateData);
    } catch (error: any) {
      logger.error(`Error updating post: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string, userId: string, isAdmin: boolean = false): Promise<Post> {
    try {
      // Check if post exists
      const post = await this.postRepository.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Check if user is authorized to delete the post
      if (!isAdmin && post.userId !== userId) {
        throw new Error('You can only delete your own posts');
      }
      
      return await this.postRepository.delete(postId);
    } catch (error: any) {
      logger.error(`Error deleting post: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all posts with optional filters
   */
  async getAllPosts(options: {
    page?: number;
    limit?: number;
    userId?: string;
    contentType?: ContentType;
  } = {}): Promise<{ posts: PostWithUser[]; total: number }> {
    try {
      return await this.postRepository.findAll(options);
    } catch (error: any) {
      logger.error(`Error fetching posts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get posts for user's feed
   */
  async getFeed(userId: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ posts: PostWithUser[]; total: number }> {
    try {
      return await this.postRepository.getFeed(userId, options);
    } catch (error: any) {
      logger.error(`Error fetching feed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search posts
   */
  async searchPosts(query: string, options: {
    page?: number;
    limit?: number;
    contentType?: ContentType;
  } = {}): Promise<{ posts: PostWithUser[]; total: number }> {
    try {
      return await this.postRepository.search(query, options);
    } catch (error: any) {
      logger.error(`Error searching posts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate post data based on content type
   */
  private validatePostData(data: Partial<CreatePostInput>): void {
    // Different content types have different requirements
    switch(data.contentType) {
      case 'text':
        if (!data.textBody || data.textBody.trim().length === 0) {
          throw new Error('Text posts require a text body');
        }
        break;
        
      case 'image':
        if (!data.mediaUrl) {
          throw new Error('Image posts require a media URL');
        }
        break;
        
      case 'video':
        if (!data.mediaUrl) {
          throw new Error('Video posts require a media URL');
        }
        break;
        
      default:
        // No validation for unknown content types
        break;
    }
  }
}
