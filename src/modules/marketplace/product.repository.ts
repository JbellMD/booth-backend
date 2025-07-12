import { PrismaClient, MarketplaceProduct, User } from '@prisma/client';

const prisma = new PrismaClient();

// Type for product creation without ID and timestamps
export type CreateProductInput = {
  sellerId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category?: string;
  stock: number;
  isActive: boolean;
};

// Type for product update
export type UpdateProductInput = Partial<Omit<CreateProductInput, 'sellerId'>>;

// Product with seller information
export type ProductWithSeller = MarketplaceProduct & {
  seller: User;
};

export class ProductRepository {
  /**
   * Create a new product
   */
  async create(data: CreateProductInput): Promise<MarketplaceProduct> {
    return prisma.marketplaceProduct.create({
      data
    });
  }

  /**
   * Find a product by ID
   */
  async findById(id: string): Promise<ProductWithSeller | null> {
    return prisma.marketplaceProduct.findUnique({
      where: { id },
      include: { seller: true }
    });
  }

  /**
   * Update a product
   */
  async update(id: string, data: UpdateProductInput): Promise<MarketplaceProduct> {
    return prisma.marketplaceProduct.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a product
   */
  async delete(id: string): Promise<MarketplaceProduct> {
    return prisma.marketplaceProduct.delete({
      where: { id }
    });
  }

  /**
   * Find all products with optional pagination and filters
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    sellerId?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
  } = {}): Promise<{ products: ProductWithSeller[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sellerId,
      category,
      minPrice,
      maxPrice,
      isActive
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build where clause based on filters
    const where: any = {};
    
    if (sellerId) {
      where.sellerId = sellerId;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    const [products, total] = await Promise.all([
      prisma.marketplaceProduct.findMany({
        where,
        skip,
        take: limit,
        include: { seller: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.marketplaceProduct.count({ where })
    ]);

    return { products, total };
  }

  /**
   * Search products by name or description
   */
  async search(query: string, options: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
  } = {}): Promise<{ products: ProductWithSeller[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      category,
      minPrice,
      maxPrice,
      isActive = true // Default to only active products for search
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build where clause based on filters and search query
    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ],
      isActive
    };
    
    if (category) {
      where.category = category;
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }
    
    const [products, total] = await Promise.all([
      prisma.marketplaceProduct.findMany({
        where,
        skip,
        take: limit,
        include: { seller: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.marketplaceProduct.count({ where })
    ]);

    return { products, total };
  }
  
  /**
   * Get product categories
   */
  async getCategories(): Promise<string[]> {
    // Get unique categories from existing products
    const products = await prisma.marketplaceProduct.findMany({
      select: { category: true },
      distinct: ['category'],
      where: {
        category: { not: null }
      }
    });
    
    return products
      .map(product => product.category as string)
      .filter(Boolean);
  }
}
