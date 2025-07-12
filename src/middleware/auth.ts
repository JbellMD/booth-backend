import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const prisma = new PrismaClient();

// Define extended express request with user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      userId?: string;
    }
  }
}

// Basic authentication middleware using Clerk
export const requireAuth = ClerkExpressRequireAuth({
  jwtKey: env.CLERK_PEM_PUBLIC_KEY,
  skipJwtVerification: !env.CLERK_PEM_PUBLIC_KEY // Only in dev mode
});

// Add user data to request object from database
export const populateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip if no auth session (should be caught by requireAuth, but just in case)
    if (!req.auth || !req.auth.userId) {
      return next();
    }

    // Get Clerk user ID
    const clerkUserId = req.auth.userId;

    // Find user in our database using Clerk ID as external ID reference
    // Here, we assume users are created in our DB on first login via webhook
    const user = await prisma.user.findFirst({
      where: {
        // For example purposes - in production you'd have a proper mapping
        id: clerkUserId
      },
      include: {
        role: true
      }
    });

    if (user) {
      // Attach user data to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role.name
      };
      req.userId = user.id;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Role-based access control middleware
export const requireRole = (allowedRoles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Convert single role to array for uniform handling
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Check if user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    // User has required role, proceed
    next();
  };
};

// Middleware to check if user is accessing their own resource
export const requireSelf = (userIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const resourceUserId = req.params[userIdParam];
    
    if (req.user.id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

// Middleware to check if user is accessing their own resource OR has admin role
export const requireSelfOrAdmin = (userIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const resourceUserId = req.params[userIdParam];
    const isAdmin = req.user.role === 'Admin';
    
    if (req.user.id !== resourceUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    next();
  };
};
