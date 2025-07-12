import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define schema for environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('3000'),
  API_URL: z.string().url().default('http://localhost:3000'),
  
  // Database
  DATABASE_URL: z.string().min(1),
  
  // Auth - Clerk
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PEM_PUBLIC_KEY: z.string().optional(),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

// Parse environment variables or throw error
export const env = envSchema.parse(process.env);

// Verify environment safety
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

// Export validated environment variables
export default env;
