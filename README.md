# Booth Backend API

A modular, scalable backend API for a social platform with marketplace, messaging, and engagement features.

## Overview

Booth Backend is a Node.js/Express application built with TypeScript, Prisma ORM, and domain-driven architecture. It implements a complete REST API for a social platform with the following features:

- User management with Clerk authentication
- Posts and content management
- Marketplace for buying and selling products
- Real-time messaging between users
- User ranking and reputation system
- Social engagement (likes, comments, shares)
- Secure payment processing with Stripe

## Architecture

The application follows a domain-driven design with a modular architecture:

- **Modules**: Each domain feature is contained in its own module with:
  - Repository: Data access layer with Prisma
  - Service: Business logic 
  - Controller: HTTP request handling
  - Routes: API endpoint definitions

- **Middleware**: 
  - Authentication with Clerk
  - User population
  - Role-based access control
  - Error handling

- **Utils**: 
  - Logging with Winston
  - Configuration management
  - Error handling utilities

## Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- Clerk account for authentication
- Stripe account for payments

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/booth-backend.git
   cd booth-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   # Server
   NODE_ENV=development
   PORT=3000
   API_URL=http://localhost:3000
   
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/booth_db
   
   # Auth - Clerk
   CLERK_SECRET_KEY=your_clerk_secret_key
   CLERK_PEM_PUBLIC_KEY=your_clerk_pem_public_key
   
   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   
   # Logging
   LOG_LEVEL=info
   ```

4. Set up the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

See [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for detailed information on available endpoints.

## Development

### Available Scripts

- `npm run dev` - Start development server with hot-reloading
- `npm run build` - Build production-ready code
- `npm start` - Run production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:deploy` - Deploy migrations to production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests

## Project Structure

```
booth-backend/
├── prisma/
│   └── schema.prisma    # Database schema
├── src/
│   ├── config/          # Configuration
│   │   └── env.ts
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts
│   │   └── error.ts
│   ├── modules/         # Feature modules
│   │   ├── users/
│   │   ├── posts/
│   │   ├── marketplace/
│   │   ├── messages/
│   │   ├── rankings/
│   │   ├── engagement/
│   │   └── payments/
│   ├── utils/           # Utilities
│   │   ├── logger.ts
│   │   └── errors.ts
│   ├── index.ts         # Application entry
│   └── server.ts        # Express server setup
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request
