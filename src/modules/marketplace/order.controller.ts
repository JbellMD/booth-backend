import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import logger from '../../utils/logger';

// Validation schemas
const orderCreateSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  totalPrice: z.number().positive(),
  shippingAddress: z.string().max(500).optional(),
});

const orderUpdateSchema = z.object({
  shippingAddress: z.string().max(500).optional(),
  status: z.enum(['pending', 'processing', 'shipped', 'completed', 'canceled']).optional(),
});

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Create a new order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
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
      const validationResult = orderCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Create order with current user as buyer
      const order = await this.orderService.createOrder({
        ...validationResult.data,
        buyerId: req.user.id
      });
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch (error: any) {
      logger.error(`Error in createOrder: ${error.message}`);
      
      if (error.message.includes('not found') || 
          error.message.includes('stock') ||
          error.message.includes('price') ||
          error.message.includes('not available')) {
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
   * Get order by ID
   */
  async getOrderById(req: Request, res: Response): Promise<void> {
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
      const order = await this.orderService.getOrderById(id);
      
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }
      
      // Check authorization - only the buyer, seller, or admin can view an order
      const isAdmin = req.user.role === 'Admin';
      const isBuyer = req.user.id === order.buyerId;
      const isSeller = req.user.id === order.product.sellerId;
      
      if (!isAdmin && !isBuyer && !isSeller) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to view this order'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error: any) {
      logger.error(`Error in getOrderById: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
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
      const { status } = req.body;
      const isAdmin = req.user.role === 'Admin';
      
      // Validate status
      if (!status || !['pending', 'processing', 'shipped', 'completed', 'canceled'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
        return;
      }

      try {
        // Update order status
        const order = await this.orderService.updateOrderStatus(
          id,
          status as OrderStatus,
          req.user.id,
          isAdmin
        );
        
        res.status(200).json({
          success: true,
          message: 'Order status updated successfully',
          data: order
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        } else if (error.message.includes('not authorized') || error.message.includes('can only')) {
          res.status(403).json({
            success: false,
            message: error.message
          });
        } else if (error.message.includes('Cannot')) {
          res.status(400).json({
            success: false,
            message: error.message
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error(`Error in updateOrderStatus: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Update order details
   */
  async updateOrder(req: Request, res: Response): Promise<void> {
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
      
      // Validate request body
      const validationResult = orderUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Update order
      try {
        // If status is included, use updateOrderStatus, otherwise update other details
        if (validationResult.data.status) {
          const order = await this.orderService.updateOrderStatus(
            id,
            validationResult.data.status,
            req.user.id,
            isAdmin
          );
          
          res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            data: order
          });
        } else {
          const order = await this.orderService.updateOrder(
            id,
            validationResult.data,
            req.user.id,
            isAdmin
          );
          
          res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            data: order
          });
        }
      } catch (error: any) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        } else if (error.message.includes('not authorized')) {
          res.status(403).json({
            success: false,
            message: error.message
          });
        } else if (error.message.includes('Cannot')) {
          res.status(400).json({
            success: false,
            message: error.message
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error(`Error in updateOrder: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
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
        const order = await this.orderService.cancelOrder(id, req.user.id, isAdmin);
        
        res.status(200).json({
          success: true,
          message: 'Order canceled successfully',
          data: order
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        } else if (error.message.includes('not authorized')) {
          res.status(403).json({
            success: false,
            message: error.message
          });
        } else if (error.message.includes('Only pending')) {
          res.status(400).json({
            success: false,
            message: error.message
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error(`Error in cancelOrder: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get user orders (as buyer)
   */
  async getMyOrders(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Parse query parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const status = req.query.status as OrderStatus | undefined;
      
      // Get user's orders
      const result = await this.orderService.getAllOrders({
        page,
        limit,
        buyerId: req.user.id,
        status
      });
      
      res.status(200).json({
        success: true,
        data: result.orders,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getMyOrders: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get seller orders
   */
  async getSellerOrders(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Parse query parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const status = req.query.status as OrderStatus | undefined;
      
      // Get seller's orders
      const result = await this.orderService.getAllOrders({
        page,
        limit,
        sellerId: req.user.id,
        status
      });
      
      res.status(200).json({
        success: true,
        data: result.orders,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getSellerOrders: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const buyerId = req.query.buyerId as string;
      const sellerId = req.query.sellerId as string;
      const status = req.query.status as OrderStatus | undefined;
      
      // Get all orders with filters
      const result = await this.orderService.getAllOrders({
        page,
        limit,
        buyerId,
        sellerId,
        status
      });
      
      res.status(200).json({
        success: true,
        data: result.orders,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getAllOrders: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get seller statistics
   */
  async getSellerStats(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get user ID from route or use authenticated user
      const sellerId = req.params.id || req.user.id;
      
      // Check if user is trying to access another user's stats
      if (sellerId !== req.user.id && req.user.role !== 'Admin') {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to view these statistics'
        });
        return;
      }
      
      // Get seller stats
      const stats = await this.orderService.getSellerStats(sellerId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error(`Error in getSellerStats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get buyer statistics
   */
  async getBuyerStats(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get user ID from route or use authenticated user
      const buyerId = req.params.id || req.user.id;
      
      // Check if user is trying to access another user's stats
      if (buyerId !== req.user.id && req.user.role !== 'Admin') {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to view these statistics'
        });
        return;
      }
      
      // Get buyer stats
      const stats = await this.orderService.getBuyerStats(buyerId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error(`Error in getBuyerStats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
}
