import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { z } from 'zod';
import logger from '../../utils/logger';

// Validation schemas
const productCreateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(5000),
  price: z.number().min(0),
  imageUrl: z.string().url(),
  category: z.string().max(50).optional(),
  stock: z.number().int().min(0),
  isActive: z.boolean().default(true)
});

const productUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().max(50).optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Create a new product
   */
  async createProduct(req: Request, res: Response): Promise<void> {
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
      const validationResult = productCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Create product with current user as seller
      const product = await this.productService.createProduct({
        ...validationResult.data,
        sellerId: req.user.id
      });
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error: any) {
      logger.error(`Error in createProduct: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = await this.productService.getProductById(id);
      
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
        return;
      }

      // Only show active products unless the viewer is the seller or an admin
      const isSeller = req.user?.id === product.sellerId;
      const isAdmin = req.user?.role === 'Admin';
      
      if (!product.isActive && !isSeller && !isAdmin) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: product
      });
    } catch (error: any) {
      logger.error(`Error in getProductById: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Update a product
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
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
      const validationResult = productUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Update product
      try {
        const product = await this.productService.updateProduct(
          id,
          req.user.id,
          validationResult.data,
          isAdmin
        );
        
        res.status(200).json({
          success: true,
          message: 'Product updated successfully',
          data: product
        });
      } catch (error: any) {
        if (error.message === 'Product not found') {
          res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        } else if (error.message === 'You can only update your own products') {
          res.status(403).json({
            success: false,
            message: 'You can only update your own products'
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error(`Error in updateProduct: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
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
        await this.productService.deleteProduct(id, req.user.id, isAdmin);
        
        res.status(200).json({
          success: true,
          message: 'Product deleted successfully'
        });
      } catch (error: any) {
        if (error.message === 'Product not found') {
          res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        } else if (error.message === 'You can only delete your own products') {
          res.status(403).json({
            success: false,
            message: 'You can only delete your own products'
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error(`Error in deleteProduct: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get all products with filtering
   */
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const sellerId = req.query.sellerId as string;
      const category = req.query.category as string;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
      
      // Only show inactive products to admins or the seller
      let isActive: boolean | undefined = undefined;
      if (req.query.isActive !== undefined) {
        isActive = req.query.isActive === 'true';
      } else {
        // By default, only show active products to regular users
        if (!req.user?.id || (sellerId && sellerId !== req.user.id && req.user.role !== 'Admin')) {
          isActive = true;
        }
      }
      
      // Get products with filters
      const result = await this.productService.getAllProducts({
        page,
        limit,
        sellerId,
        category,
        minPrice,
        maxPrice,
        isActive
      });
      
      res.status(200).json({
        success: true,
        data: result.products,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in getProducts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Search products
   */
  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const category = req.query.category as string;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
      
      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }
      
      // Search products
      const result = await this.productService.searchProducts(query, {
        page,
        limit,
        category,
        minPrice,
        maxPrice,
        isActive: true // Default to only active products for search
      });
      
      res.status(200).json({
        success: true,
        data: result.products,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      logger.error(`Error in searchProducts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get product categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.productService.getCategories();
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      logger.error(`Error in getCategories: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
}
