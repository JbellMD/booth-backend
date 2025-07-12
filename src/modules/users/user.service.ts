import { User } from '@prisma/client';
import { UserRepository, CreateUserInput, UpdateUserInput, UserWithRole } from './user.repository';
import logger from '../../utils/logger';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserInput): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create new user
      return await this.userRepository.create(userData);
    } catch (error: any) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a user by ID
   */
  async getUserById(userId: string): Promise<UserWithRole | null> {
    try {
      return await this.userRepository.findById(userId);
    } catch (error: any) {
      logger.error(`Error fetching user by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<UserWithRole | null> {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error: any) {
      logger.error(`Error fetching user by email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, updateData: UpdateUserInput): Promise<User> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // If email is being updated, check if it's already taken
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(updateData.email);
        if (existingUser) {
          throw new Error('Email already in use');
        }
      }

      return await this.userRepository.update(userId, updateData);
    } catch (error: any) {
      logger.error(`Error updating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<User> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return await this.userRepository.delete(userId);
    } catch (error: any) {
      logger.error(`Error deleting user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: UserWithRole[], total: number }> {
    try {
      return await this.userRepository.findAll(page, limit);
    } catch (error: any) {
      logger.error(`Error fetching all users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string, page: number = 1, limit: number = 10): Promise<{ users: UserWithRole[], total: number }> {
    try {
      return await this.userRepository.search(query, page, limit);
    } catch (error: any) {
      logger.error(`Error searching users: ${error.message}`);
      throw error;
    }
  }
}
