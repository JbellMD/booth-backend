import { Message } from '@prisma/client';
import { 
  MessageRepository, 
  CreateMessageInput, 
  UpdateMessageInput, 
  MessageWithUsers,
  ConversationSummary
} from './message.repository';
import logger from '../../utils/logger';

export class MessageService {
  private messageRepository: MessageRepository;

  constructor() {
    this.messageRepository = new MessageRepository();
  }

  /**
   * Send a new message
   */
  async sendMessage(messageData: CreateMessageInput): Promise<Message> {
    try {
      // Validate message data
      if (!messageData.content || messageData.content.trim().length === 0) {
        throw new Error('Message content is required');
      }
      
      // Prevent sending message to self
      if (messageData.senderId === messageData.recipientId) {
        throw new Error('Cannot send a message to yourself');
      }
      
      return await this.messageRepository.create(messageData);
    } catch (error: any) {
      logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a message by ID
   */
  async getMessageById(messageId: string): Promise<MessageWithUsers | null> {
    try {
      return await this.messageRepository.findById(messageId);
    } catch (error: any) {
      logger.error(`Error fetching message by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<Message> {
    try {
      // Get the message
      const message = await this.messageRepository.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Check if the user is the recipient
      if (message.recipientId !== userId) {
        throw new Error('You can only mark messages sent to you as read');
      }
      
      // Only update if not already read
      if (!message.isRead) {
        return await this.messageRepository.update(messageId, { isRead: true });
      }
      
      return message;
    } catch (error: any) {
      logger.error(`Error marking message as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a message
   * Users can only delete messages they sent or received
   */
  async deleteMessage(messageId: string, userId: string, isAdmin: boolean = false): Promise<Message> {
    try {
      // Get the message
      const message = await this.messageRepository.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Check if the user is authorized to delete the message
      if (!isAdmin && message.senderId !== userId && message.recipientId !== userId) {
        throw new Error('You are not authorized to delete this message');
      }
      
      return await this.messageRepository.delete(messageId);
    } catch (error: any) {
      logger.error(`Error deleting message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conversation between two users
   */
  async getConversation(
    userId1: string, 
    userId2: string, 
    options: { page?: number; limit?: number } = {}
  ): Promise<{ messages: MessageWithUsers[]; total: number }> {
    try {
      return await this.messageRepository.getConversation(userId1, userId2, options);
    } catch (error: any) {
      logger.error(`Error fetching conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<ConversationSummary[]> {
    try {
      return await this.messageRepository.getUserConversations(userId);
    } catch (error: any) {
      logger.error(`Error fetching user conversations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(userId: string, senderId: string): Promise<number> {
    try {
      return await this.messageRepository.markConversationAsRead(userId, senderId);
    } catch (error: any) {
      logger.error(`Error marking conversation as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get total unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.messageRepository.getUnreadCount(userId);
    } catch (error: any) {
      logger.error(`Error getting unread count: ${error.message}`);
      throw error;
    }
  }
}
