import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import logger, { httpLogger } from './utils/logger';

// Import module routes
import userRoutes from './modules/users/user.routes';
import postRoutes from './modules/posts/post.routes';
import productRoutes from './modules/marketplace/product.routes';
import orderRoutes from './modules/marketplace/order.routes';
import messageRoutes from './modules/messages/message.routes';
import rankingRoutes from './modules/rankings/ranking.routes';
import engagementRoutes from './modules/engagement/engagement.routes';

// Create Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev', { stream: { write: (message) => logger.http(message.trim()) } })); // HTTP request logging
app.use(httpLogger); // Custom HTTP logger with response times

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/engagement', engagementRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(err.stack || 'No stack trace available');

  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

export default app;
