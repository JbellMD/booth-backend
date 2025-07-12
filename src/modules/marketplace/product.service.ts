import { MarketplaceProduct } from '@prisma/client';
import { ProductRepository, CreateProductInput, UpdateProductInput, ProductWithSeller } from './product.repository';
import logger from '../../utils/logger';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  /**
   * Create a new marketplace product
   */
  async createProduct(productData: CreateProductInput): Promise<MarketplaceProduct> {
    try {
      // Validate product data
      this.validateProductData(productData);
      
      return await this.productRepository.create(productData);
    } catch (error: any) {
      logger.error(`Error creating product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a product by ID
   */
  async getProductById(productId: string): Promise<ProductWithSeller | null> {
    try {
      return await this.productRepository.findById(productId);
    } catch (error: any) {
      logger.error(`Error fetching product by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a product
   */
  async updateProduct(productId: string, userId: string, updateData: UpdateProductInput, isAdmin: boolean = false): Promise<MarketplaceProduct> {
    try {
      // Check if product exists and belongs to the user
      const product = await this.productRepository.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (!isAdmin && product.sellerId !== userId) {
        throw new Error('You can only update your own products');
      }
      
      return await this.productRepository.update(productId, updateData);
    } catch (error: any) {
      logger.error(`Error updating product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string, userId: string, isAdmin: boolean = false): Promise<MarketplaceProduct> {
    try {
      // Check if product exists and belongs to the user
      const product = await this.productRepository.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (!isAdmin && product.sellerId !== userId) {
        throw new Error('You can only delete your own products');
      }
      
      return await this.productRepository.delete(productId);
    } catch (error: any) {
      logger.error(`Error deleting product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all products with filtering and pagination
   */
  async getAllProducts(options: {
    page?: number;
    limit?: number;
    sellerId?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
  } = {}): Promise<{ products: ProductWithSeller[]; total: number }> {
    try {
      return await this.productRepository.findAll(options);
    } catch (error: any) {
      logger.error(`Error fetching products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: string, options: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
  } = {}): Promise<{ products: ProductWithSeller[]; total: number }> {
    try {
      return await this.productRepository.search(query, options);
    } catch (error: any) {
      logger.error(`Error searching products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<string[]> {
    try {
      return await this.productRepository.getCategories();
    } catch (error: any) {
      logger.error(`Error fetching product categories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate product data
   */
  private validateProductData(data: Partial<CreateProductInput>): void {
    if (data.price !== undefined && data.price < 0) {
      throw new Error('Price cannot be negative');
    }
    
    if (data.stock !== undefined && data.stock < 0) {
      throw new Error('Stock cannot be negative');
    }

    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      throw new Error('Product name is required');
    }

    if (data.description !== undefined && (!data.description || data.description.trim().length === 0)) {
      throw new Error('Product description is required');
    }
  }
}
