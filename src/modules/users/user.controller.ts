import { Request, Response } from 'express';
import { UserService } from './user.service';
import { z } from 'zod';
import logger from '../../utils/logger';

// Validation schemas
const userCreateSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(50),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  location: z.string().max(100).optional(),
  roleId: z.string().uuid()
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  location: z.string().max(100).optional()
});

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // User should be attached to request by auth middleware
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const user = await this.userService.getUserById(req.user.id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Remove sensitive data
      const { passwordHash, ...safeUser } = user;
      
      res.status(200).json({
        success: true,
        data: safeUser
      });
    } catch (error: any) {
      logger.error(`Error in getCurrentUser: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Remove sensitive data for public profile
      const { passwordHash, email, ...publicUser } = user;
      
      res.status(200).json({
        success: true,
        data: publicUser
      });
    } catch (error: any) {
      logger.error(`Error in getUserById: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Update user profile
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is updating their own profile (checked by middleware)
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }
      
      // Validate request body
      const validationResult = userUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Update user
      const updatedUser = await this.userService.updateUser(userId, validationResult.data);
      
      // Remove sensitive data
      const { passwordHash, ...safeUser } = updatedUser;
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: safeUser
      });
    } catch (error: any) {
      logger.error(`Error in updateUser: ${error.message}`);
      
      if (error.message === 'Email already in use') {
        res.status(409).json({
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
   * Search users
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');

      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      const results = await this.userService.searchUsers(query, page, limit);
      
      // Remove sensitive data from results
      const safeUsers = results.users.map(user => {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
      });
      
      res.status(200).json({
        success: true,
        data: safeUsers,
        meta: {
          total: results.total,
          page,
          limit,
          totalPages: Math.ceil(results.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in searchUsers: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Admin-only: Create a new user
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = userCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Create user
      const newUser = await this.userService.createUser(validationResult.data);
      
      // Remove sensitive data
      const { passwordHash, ...safeUser } = newUser;
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: safeUser
      });
    } catch (error: any) {
      logger.error(`Error in createUser: ${error.message}`);
      
      if (error.message === 'User with this email already exists') {
        res.status(409).json({
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
   * Admin-only: Get all users with pagination
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      
      const results = await this.userService.getAllUsers(page, limit);
      
      // Remove sensitive data from results
      const safeUsers = results.users.map(user => {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
      });
      
      res.status(200).json({
        success: true,
        data: safeUsers,
        meta: {
          total: results.total,
          page,
          limit,
          totalPages: Math.ceil(results.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getAllUsers: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Admin-only: Delete a user
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await this.userService.deleteUser(id);
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      logger.error(`Error in deleteUser: ${error.message}`);
      
      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          message: 'User not found'
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
}
