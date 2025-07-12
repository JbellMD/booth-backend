import Stripe from 'stripe';
import { env } from '../../config/env';
import logger from '../../utils/logger';

// Initialize Stripe with API key
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the latest stable API version
});

export type PaymentIntent = {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
};

export type StripeAccount = {
  id: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  accountLink?: string;
};

export class PaymentService {
  /**
   * Create a payment intent for a product purchase
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {}
  ): Promise<PaymentIntent> {
    try {
      // Amount needs to be in smallest currency unit (cents for USD)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret as string,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      logger.error(`Error creating payment intent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret as string,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      logger.error(`Error retrieving payment intent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret as string,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      logger.error(`Error cancelling payment intent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a Stripe Connect account for a seller
   */
  async createConnectAccount(
    email: string,
    userId: string,
    country: string = 'US'
  ): Promise<StripeAccount> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId,
        },
      });

      return {
        id: account.id,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
      };
    } catch (error: any) {
      logger.error(`Error creating connect account: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create an account link for onboarding
   */
  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<string> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error: any) {
      logger.error(`Error creating account link: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Stripe Connect account details
   */
  async getConnectAccount(accountId: string): Promise<StripeAccount> {
    try {
      const account = await stripe.accounts.retrieve(accountId);

      return {
        id: account.id,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
      };
    } catch (error: any) {
      logger.error(`Error retrieving connect account: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a transfer to a connected account
   */
  async createTransfer(
    amount: number,
    destinationAccountId: string,
    metadata: Record<string, string> = {}
  ): Promise<any> {
    try {
      // Amount needs to be in smallest currency unit (cents for USD)
      const amountInCents = Math.round(amount * 100);

      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: 'usd',
        destination: destinationAccountId,
        metadata,
      });

      return transfer;
    } catch (error: any) {
      logger.error(`Error creating transfer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a webhook event from Stripe
   */
  async processWebhook(requestBody: any, signature: string): Promise<any> {
    try {
      // Verify and construct the event
      const event = stripe.webhooks.constructEvent(
        requestBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );

      // Handle specific event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(event.data.object);

        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(event.data.object);
          
        case 'account.updated':
          return await this.handleAccountUpdated(event.data.object);

        // Add more event handlers as needed
        default:
          logger.info(`Unhandled Stripe event type: ${event.type}`);
          return { status: 'ignored', type: event.type };
      }
    } catch (error: any) {
      logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle payment_intent.succeeded webhook event
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<any> {
    try {
      logger.info(`Payment succeeded: ${paymentIntent.id}`);

      // Here you would typically:
      // 1. Update order status in your database
      // 2. Create a transfer to the seller's connected account if applicable
      // 3. Send email notifications

      // Example implementation would depend on your specific business logic
      return { status: 'processed', type: 'payment_intent.succeeded', id: paymentIntent.id };
    } catch (error: any) {
      logger.error(`Error handling payment success: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle payment_intent.payment_failed webhook event
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<any> {
    try {
      logger.info(`Payment failed: ${paymentIntent.id}`);

      // Here you would typically:
      // 1. Update order status in your database
      // 2. Notify the buyer and seller
      // 3. Take any necessary recovery actions

      return { status: 'processed', type: 'payment_intent.payment_failed', id: paymentIntent.id };
    } catch (error: any) {
      logger.error(`Error handling payment failure: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle account.updated webhook event
   */
  private async handleAccountUpdated(account: Stripe.Account): Promise<any> {
    try {
      logger.info(`Account updated: ${account.id}`);

      // Here you would typically:
      // 1. Update the seller's account status in your database
      // 2. Enable or disable selling capabilities based on account status

      return { 
        status: 'processed', 
        type: 'account.updated', 
        id: account.id,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled 
      };
    } catch (error: any) {
      logger.error(`Error handling account update: ${error.message}`);
      throw error;
    }
  }
}
