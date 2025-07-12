import { PrismaClient, Message, User } from '@prisma/client';

const prisma = new PrismaClient();

// Type for message creation without ID and timestamps
export type CreateMessageInput = {
  senderId: string;
  recipientId: string;
  content: string;
  isRead?: boolean;
};

// Type for message update
export type UpdateMessageInput = Partial<Pick<CreateMessageInput, 'isRead'>>;

// Message with sender and recipient information
export type MessageWithUsers = Message & {
  sender: User;
  recipient: User;
};

// Conversation summary type
export type ConversationSummary = {
  userId: string;
  user: User;
  lastMessage: Message;
  unreadCount: number;
};

export class MessageRepository {
  /**
   * Create a new message
   */
  async create(data: CreateMessageInput): Promise<Message> {
    return prisma.message.create({
      data: {
        ...data,
        isRead: data.isRead || false // Default to unread
      }
    });
  }

  /**
   * Find a message by ID
   */
  async findById(id: string): Promise<MessageWithUsers | null> {
    return prisma.message.findUnique({
      where: { id },
      include: {
        sender: true,
        recipient: true
      }
    });
  }

  /**
   * Update a message
   */
  async update(id: string, data: UpdateMessageInput): Promise<Message> {
    return prisma.message.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a message
   */
  async delete(id: string): Promise<Message> {
    return prisma.message.delete({
      where: { id }
    });
  }

  /**
   * Get conversation between two users
   */
  async getConversation(
    userId1: string,
    userId2: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ messages: MessageWithUsers[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId1, recipientId: userId2 },
            { senderId: userId2, recipientId: userId1 }
          ]
        },
        include: {
          sender: true,
          recipient: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.message.count({
        where: {
          OR: [
            { senderId: userId1, recipientId: userId2 },
            { senderId: userId2, recipientId: userId1 }
          ]
        }
      })
    ]);

    return { messages, total };
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<ConversationSummary[]> {
    // Get the IDs of users this user has conversations with
    const conversationPartners = await prisma.$queryRaw<
      { userId: string }[]
    >`
      SELECT DISTINCT 
        CASE 
          WHEN "senderId" = ${userId} THEN "recipientId" 
          ELSE "senderId" 
        END as "userId"
      FROM "Message"
      WHERE "senderId" = ${userId} OR "recipientId" = ${userId}
    `;

    // For each conversation partner, get the last message and unread count
    const conversations: ConversationSummary[] = await Promise.all(
      conversationPartners.map(async ({ userId: partnerId }) => {
        // Get last message
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, recipientId: partnerId },
              { senderId: partnerId, recipientId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        // Get unread count
        const unreadCount = await prisma.message.count({
          where: {
            senderId: partnerId,
            recipientId: userId,
            isRead: false
          }
        });

        // Get user details
        const user = await prisma.user.findUnique({
          where: { id: partnerId }
        });

        if (!lastMessage || !user) {
          throw new Error(`Could not find conversation data for partner ${partnerId}`);
        }

        return {
          userId: partnerId,
          user,
          lastMessage,
          unreadCount
        };
      })
    );

    // Sort by most recent message
    return conversations.sort(
      (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
    );
  }

  /**
   * Mark all messages from a specific user as read
   */
  async markConversationAsRead(userId: string, senderId: string): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        senderId: senderId,
        recipientId: userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return result.count;
  }

  /**
   * Get total unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.message.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });
  }
}
