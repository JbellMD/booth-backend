import { Request, Response } from 'express';
import { MessageService } from './message.service';
import { z } from 'zod';
import logger from '../../utils/logger';

// Validation schemas
const messageCreateSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  /**
   * Send a new message
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
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
      const validationResult = messageCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Send message with current user as sender
      const message = await this.messageService.sendMessage({
        ...validationResult.data,
        senderId: req.user.id
      });
      
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error: any) {
      logger.error(`Error in sendMessage: ${error.message}`);
      
      if (error.message === 'Cannot send a message to yourself') {
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
   * Get a message by ID
   */
  async getMessageById(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const message = await this.messageService.getMessageById(id);
      
      if (!message) {
        res.status(404).json({
          success: false,
          message: 'Message not found'
        });
        return;
      }
      
      // Check authorization - only sender, recipient, or admin can view message
      const isAdmin = req.user.role === 'Admin';
      const isSender = req.user.id === message.senderId;
      const isRecipient = req.user.id === message.recipientId;
      
      if (!isAdmin && !isSender && !isRecipient) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to view this message'
        });
        return;
      }
      
      // If user is recipient and message is unread, mark as read
      if (isRecipient && !message.isRead) {
        await this.messageService.markMessageAsRead(id, req.user.id);
      }
      
      res.status(200).json({
        success: true,
        data: message
      });
    } catch (error: any) {
      logger.error(`Error in getMessageById: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const isAdmin = req.user.role === 'Admin';
      
      try {
        await this.messageService.deleteMessage(id, req.user.id, isAdmin);
        
        res.status(200).json({
          success: true,
          message: 'Message deleted successfully'
        });
      } catch (error: any) {
        if (error.message === 'Message not found') {
          res.status(404).json({
            success: false,
            message: 'Message not found'
          });
        } else if (error.message === 'You are not authorized to delete this message') {
          res.status(403).json({
            success: false,
            message: error.message
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error(`Error in deleteMessage: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get conversation between current user and another user
   */
  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { userId } = req.params;
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      
      // Get conversation
      const result = await this.messageService.getConversation(req.user.id, userId, {
        page,
        limit
      });
      
      // Mark conversation as read
      await this.messageService.markConversationAsRead(req.user.id, userId);
      
      res.status(200).json({
        success: true,
        data: result.messages,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getConversation: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get all conversations for the current user
   */
  async getUserConversations(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get all conversations
      const conversations = await this.messageService.getUserConversations(req.user.id);
      
      res.status(200).json({
        success: true,
        data: conversations
      });
    } catch (error: any) {
      logger.error(`Error in getUserConversations: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Mark conversation as read
   */
  async markConversationAsRead(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { userId } = req.params;
      
      // Mark all messages from userId to current user as read
      const count = await this.messageService.markConversationAsRead(req.user.id, userId);
      
      res.status(200).json({
        success: true,
        message: `Marked ${count} messages as read`,
        data: { count }
      });
    } catch (error: any) {
      logger.error(`Error in markConversationAsRead: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get unread count
      const count = await this.messageService.getUnreadCount(req.user.id);
      
      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error: any) {
      logger.error(`Error in getUnreadCount: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
}
