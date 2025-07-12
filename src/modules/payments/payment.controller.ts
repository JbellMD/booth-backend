import { Request, Response } from 'express';
import { z } from 'zod';
import { PaymentService } from './payment.service';
import logger from '../../utils/logger';

// Validation schemas
const paymentIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('usd'),
  metadata: z.record(z.string()).optional().default({}),
});

const accountCreateSchema = z.object({
  email: z.string().email(),
  country: z.string().min(2).max(2).default('US'),
});

const accountLinkSchema = z.object({
  accountId: z.string(),
  refreshUrl: z.string().url(),
  returnUrl: z.string().url(),
});

const transferSchema = z.object({
  amount: z.number().positive(),
  destinationAccountId: z.string(),
  metadata: z.record(z.string()).optional().default({}),
});

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(req: Request, res: Response): Promise<void> {
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
      const validationResult = paymentIntentSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }

      // Add user ID to metadata
      const metadata = {
        ...validationResult.data.metadata,
        userId: req.user.id
      };
      
      const paymentIntent = await this.paymentService.createPaymentIntent(
        validationResult.data.amount,
        validationResult.data.currency,
        metadata
      );
      
      res.status(201).json({
        success: true,
        data: paymentIntent
      });
    } catch (error: any) {
      logger.error(`Error in createPaymentIntent: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(req: Request, res: Response): Promise<void> {
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
      const paymentIntent = await this.paymentService.retrievePaymentIntent(id);
      
      res.status(200).json({
        success: true,
        data: paymentIntent
      });
    } catch (error: any) {
      logger.error(`Error in getPaymentIntent: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(req: Request, res: Response): Promise<void> {
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
      const paymentIntent = await this.paymentService.cancelPaymentIntent(id);
      
      res.status(200).json({
        success: true,
        data: paymentIntent
      });
    } catch (error: any) {
      logger.error(`Error in cancelPaymentIntent: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Create a Stripe Connect account for seller
   */
  async createConnectAccount(req: Request, res: Response): Promise<void> {
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
      const validationResult = accountCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }
      
      const account = await this.paymentService.createConnectAccount(
        validationResult.data.email,
        req.user.id,
        validationResult.data.country
      );
      
      res.status(201).json({
        success: true,
        data: account
      });
    } catch (error: any) {
      logger.error(`Error in createConnectAccount: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Create an account link for onboarding
   */
  async createAccountLink(req: Request, res: Response): Promise<void> {
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
      const validationResult = accountLinkSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }
      
      const accountLink = await this.paymentService.createAccountLink(
        validationResult.data.accountId,
        validationResult.data.refreshUrl,
        validationResult.data.returnUrl
      );
      
      res.status(201).json({
        success: true,
        data: { url: accountLink }
      });
    } catch (error: any) {
      logger.error(`Error in createAccountLink: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Get Stripe Connect account details
   */
  async getConnectAccount(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { accountId } = req.params;
      const account = await this.paymentService.getConnectAccount(accountId);
      
      res.status(200).json({
        success: true,
        data: account
      });
    } catch (error: any) {
      logger.error(`Error in getConnectAccount: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Create a transfer to a connected account
   */
  async createTransfer(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Only admins can create transfers manually
      if (req.user.role !== 'Admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      // Validate request body
      const validationResult = transferSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: validationResult.error.errors
        });
        return;
      }
      
      const transfer = await this.paymentService.createTransfer(
        validationResult.data.amount,
        validationResult.data.destinationAccountId,
        {
          ...validationResult.data.metadata,
          initiatedBy: req.user.id
        }
      );
      
      res.status(201).json({
        success: true,
        data: transfer
      });
    } catch (error: any) {
      logger.error(`Error in createTransfer: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Process Stripe webhook
   */
  async processWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        res.status(400).json({
          success: false,
          message: 'Missing Stripe signature'
        });
        return;
      }
      
      // Raw body is needed for webhook signature verification
      const result = await this.paymentService.processWebhook(
        req.body,
        signature
      );
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error(`Error in processWebhook: ${error.message}`);
      res.status(400).json({
        success: false,
        message: 'Webhook error',
        error: error.message
      });
    }
  }
}
