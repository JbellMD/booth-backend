import { PrismaClient, Order, OrderStatus, User, MarketplaceProduct } from '@prisma/client';

const prisma = new PrismaClient();

// Type for order creation without ID and timestamps
export type CreateOrderInput = {
  buyerId: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  status?: OrderStatus;
  shippingAddress?: string;
};

// Type for order update
export type UpdateOrderInput = Partial<Omit<CreateOrderInput, 'buyerId' | 'productId'>>;

// Order with buyer and product information
export type OrderWithDetails = Order & {
  buyer: User;
  product: MarketplaceProduct & {
    seller: User;
  };
};

export class OrderRepository {
  /**
   * Create a new order
   */
  async create(data: CreateOrderInput): Promise<Order> {
    return prisma.order.create({
      data: {
        ...data,
        status: data.status || 'pending' // Default status is pending
      }
    });
  }

  /**
   * Find an order by ID
   */
  async findById(id: string): Promise<OrderWithDetails | null> {
    return prisma.order.findUnique({
      where: { id },
      include: {
        buyer: true,
        product: {
          include: {
            seller: true
          }
        }
      }
    });
  }

  /**
   * Update an order
   */
  async update(id: string, data: UpdateOrderInput): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data
    });
  }

  /**
   * Delete an order
   */
  async delete(id: string): Promise<Order> {
    return prisma.order.delete({
      where: { id }
    });
  }

  /**
   * Find all orders with optional pagination and filters
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    buyerId?: string;
    sellerId?: string;
    status?: OrderStatus;
  } = {}): Promise<{ orders: OrderWithDetails[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      buyerId,
      sellerId,
      status
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build where clause based on filters
    const where: any = {};
    
    if (buyerId) {
      where.buyerId = buyerId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (sellerId) {
      where.product = {
        sellerId
      };
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          buyer: true,
          product: {
            include: {
              seller: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    return { orders, total };
  }
  
  /**
   * Get order statistics for a seller
   */
  async getSellerStats(sellerId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
  }> {
    // Get all orders for products sold by this seller
    const orders = await prisma.order.findMany({
      where: {
        product: {
          sellerId
        }
      }
    });
    
    // Calculate statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    
    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders
    };
  }
  
  /**
   * Get order statistics for a buyer
   */
  async getBuyerStats(buyerId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    pendingOrders: number;
    completedOrders: number;
  }> {
    // Get all orders for this buyer
    const orders = await prisma.order.findMany({
      where: {
        buyerId
      }
    });
    
    // Calculate statistics
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    
    return {
      totalOrders,
      totalSpent,
      pendingOrders,
      completedOrders
    };
  }
}
