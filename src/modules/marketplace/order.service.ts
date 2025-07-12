import { Order, OrderStatus } from '@prisma/client';
import { OrderRepository, CreateOrderInput, UpdateOrderInput, OrderWithDetails } from './order.repository';
import { ProductService } from './product.service';
import logger from '../../utils/logger';

export class OrderService {
  private orderRepository: OrderRepository;
  private productService: ProductService;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.productService = new ProductService();
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderInput): Promise<Order> {
    try {
      // Get the product to validate and calculate price
      const product = await this.productService.getProductById(orderData.productId);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (!product.isActive) {
        throw new Error('Product is not available for purchase');
      }
      
      if (product.stock < orderData.quantity) {
        throw new Error('Not enough stock available');
      }
      
      // Calculate the total price based on current product price and quantity
      const calculatedPrice = product.price * orderData.quantity;
      
      // Validate that the provided price matches the calculated price
      if (Math.abs(calculatedPrice - orderData.totalPrice) > 0.01) {
        throw new Error('Price mismatch - order price does not match current product price');
      }
      
      // Create the order
      const order = await this.orderRepository.create(orderData);
      
      // Update the product stock
      await this.productService.updateProduct(
        product.id,
        product.sellerId,
        { stock: product.stock - orderData.quantity },
        true // Admin mode to bypass regular authorization
      );
      
      return order;
    } catch (error: any) {
      logger.error(`Error creating order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get an order by ID
   */
  async getOrderById(orderId: string): Promise<OrderWithDetails | null> {
    try {
      return await this.orderRepository.findById(orderId);
    } catch (error: any) {
      logger.error(`Error fetching order by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, userId: string, isAdmin: boolean = false): Promise<Order> {
    try {
      // Get the order with product and seller info
      const order = await this.orderRepository.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Check authorization - only the seller, buyer, or admin can update order status
      if (!isAdmin && order.product.sellerId !== userId && order.buyerId !== userId) {
        throw new Error('You are not authorized to update this order');
      }
      
      // Additional validation for status transitions
      this.validateStatusTransition(order.status, status, userId, order);
      
      // Update the order
      return await this.orderRepository.update(orderId, { status });
    } catch (error: any) {
      logger.error(`Error updating order status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update order details (shipping address, etc.)
   */
  async updateOrder(orderId: string, updateData: UpdateOrderInput, userId: string, isAdmin: boolean = false): Promise<Order> {
    try {
      // Get the order
      const order = await this.orderRepository.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Check authorization - only the buyer or admin can update order details
      if (!isAdmin && order.buyerId !== userId) {
        throw new Error('You are not authorized to update this order');
      }
      
      // Cannot update certain fields for completed orders
      if (order.status === 'completed' && !isAdmin) {
        throw new Error('Cannot update a completed order');
      }
      
      // Update the order
      return await this.orderRepository.update(orderId, updateData);
    } catch (error: any) {
      logger.error(`Error updating order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<Order> {
    try {
      // Get the order
      const order = await this.orderRepository.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Check authorization - buyer, seller, or admin can cancel
      if (!isAdmin && order.buyerId !== userId && order.product.sellerId !== userId) {
        throw new Error('You are not authorized to cancel this order');
      }
      
      // Can only cancel pending orders
      if (order.status !== 'pending') {
        throw new Error('Only pending orders can be canceled');
      }
      
      // Update the order to canceled status
      const updatedOrder = await this.orderRepository.update(orderId, { 
        status: 'canceled' 
      });
      
      // Restore product stock
      await this.productService.updateProduct(
        order.productId,
        order.product.sellerId,
        { stock: order.product.stock + order.quantity },
        true // Admin mode to bypass regular authorization
      );
      
      return updatedOrder;
    } catch (error: any) {
      logger.error(`Error canceling order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all orders with filtering
   */
  async getAllOrders(options: {
    page?: number;
    limit?: number;
    buyerId?: string;
    sellerId?: string;
    status?: OrderStatus;
  } = {}): Promise<{ orders: OrderWithDetails[]; total: number }> {
    try {
      return await this.orderRepository.findAll(options);
    } catch (error: any) {
      logger.error(`Error fetching orders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get seller statistics
   */
  async getSellerStats(sellerId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
  }> {
    try {
      return await this.orderRepository.getSellerStats(sellerId);
    } catch (error: any) {
      logger.error(`Error fetching seller stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get buyer statistics
   */
  async getBuyerStats(buyerId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    pendingOrders: number;
    completedOrders: number;
  }> {
    try {
      return await this.orderRepository.getBuyerStats(buyerId);
    } catch (error: any) {
      logger.error(`Error fetching buyer stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate order status transition
   */
  private validateStatusTransition(
    currentStatus: OrderStatus, 
    newStatus: OrderStatus, 
    userId: string,
    order: OrderWithDetails
  ): void {
    // Prevent invalid transitions
    switch(currentStatus) {
      case 'pending':
        // Pending can transition to processing, completed, or canceled
        if (!['processing', 'completed', 'canceled'].includes(newStatus)) {
          throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
        }
        break;
        
      case 'processing':
        // Processing can transition to completed, shipped, or canceled
        if (!['completed', 'shipped', 'canceled'].includes(newStatus)) {
          throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
        }
        break;
        
      case 'shipped':
        // Shipped can only transition to completed
        if (newStatus !== 'completed') {
          throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
        }
        break;
        
      case 'completed':
        // Completed is a terminal state
        throw new Error('Cannot change status of a completed order');
        
      case 'canceled':
        // Canceled is a terminal state
        throw new Error('Cannot change status of a canceled order');
    }
    
    // Role-based permissions for status transitions
    const isSeller = userId === order.product.sellerId;
    const isBuyer = userId === order.buyerId;
    
    // Sellers can set orders to processing, shipped, or completed
    if (isSeller && !['processing', 'shipped', 'completed'].includes(newStatus)) {
      throw new Error('Sellers can only set orders to processing, shipped, or completed');
    }
    
    // Buyers can only cancel pending orders
    if (isBuyer && newStatus !== 'canceled') {
      throw new Error('Buyers can only cancel pending orders');
    }
  }
}
