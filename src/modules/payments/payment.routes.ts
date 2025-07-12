import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { requireAuth, populateUser, requireRole } from '../../middleware/auth';
import express from 'express';

const router = Router();
const paymentController = new PaymentController();

// Stripe webhook - needs raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => 
  paymentController.processWebhook(req, res)
);

// Protected routes
router.use(requireAuth);
router.use(populateUser);

// Payment intent routes
router.post('/intent', (req, res) => paymentController.createPaymentIntent(req, res));
router.get('/intent/:id', (req, res) => paymentController.getPaymentIntent(req, res));
router.post('/intent/:id/cancel', (req, res) => paymentController.cancelPaymentIntent(req, res));

// Connect account routes
router.post('/connect/account', (req, res) => paymentController.createConnectAccount(req, res));
router.post('/connect/account-link', (req, res) => paymentController.createAccountLink(req, res));
router.get('/connect/account/:accountId', (req, res) => paymentController.getConnectAccount(req, res));

// Admin-only routes
router.post('/transfer', requireRole('Admin'), (req, res) => paymentController.createTransfer(req, res));

export default router;
