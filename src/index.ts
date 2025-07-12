import app from './server';
import { PrismaClient } from '@prisma/client';
import { env } from './config/env';
import logger from './utils/logger';

// Export app for testing purposes
export { app };

// Initialize Prisma client
export const prisma = new PrismaClient();

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Log when server is shutting down
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully');
  prisma.$disconnect();
  process.exit(0);
});

// Export module functionality for easier imports
export * from './modules/users/user.repository';
export * from './modules/users/user.service';
export * from './modules/posts/post.repository';
export * from './modules/posts/post.service';
export * from './modules/marketplace/product.repository';
export * from './modules/marketplace/product.service';
export * from './modules/marketplace/order.repository';
export * from './modules/marketplace/order.service';
export * from './modules/messages/message.repository';
export * from './modules/messages/message.service';
export * from './modules/rankings/ranking.repository';
export * from './modules/rankings/ranking.service';
export * from './modules/engagement/engagement.repository';
export * from './modules/engagement/engagement.service';
export * from './modules/payments/payment.service';
