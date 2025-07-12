# Booth Backend API Documentation

This document provides detailed documentation for all API endpoints in the Booth backend system. The API is organized by domain modules, with each section describing the available endpoints, required parameters, and example responses.

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Posts](#posts)
4. [Marketplace - Products](#marketplace---products)
5. [Marketplace - Orders](#marketplace---orders)
6. [Messaging](#messaging)
7. [Rankings](#rankings)
8. [Engagement](#engagement)
9. [Payments](#payments)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)
12. [Pagination](#pagination)

## Authentication

All protected endpoints require authentication using a JWT token provided by Clerk. The token should be included in the Authorization header using the Bearer scheme.

```
Authorization: Bearer <token>
```

### User Roles

The following user roles are supported:
- `User`: Default role for all authenticated users
- `Admin`: Administrative users with elevated privileges
- `Seller`: Users who can sell products in the marketplace

## Users

User management is handled through Clerk, with additional user data stored in our database.

### Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|--------------|-------|
| GET | `/api/users` | Get all users | Yes | Admin |
| GET | `/api/users/:id` | Get user by ID | Yes | Any |
| GET | `/api/users/me` | Get current user | Yes | Any |
| PUT | `/api/users/me` | Update current user | Yes | Any |
| GET | `/api/users/:id/profile` | Get user profile | No | - |
| PUT | `/api/users/:id/role` | Update user role | Yes | Admin |

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "User",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-02T00:00:00Z"
  }
}
```

## Posts

Endpoints for creating, retrieving, updating, and deleting posts.

### Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|--------------|-------|
| GET | `/api/posts` | Get all posts | No | - |
| GET | `/api/posts/:id` | Get post by ID | No | - |
| POST | `/api/posts` | Create new post | Yes | Any |
| PUT | `/api/posts/:id` | Update post | Yes | Author/Admin |
| DELETE | `/api/posts/:id` | Delete post | Yes | Author/Admin |
| GET | `/api/posts/user/:userId` | Get posts by user | No | - |

### Example Request (Create Post)

```json
{
  "title": "My First Post",
  "content": "This is the content of my first post",
  "tags": ["introduction", "first-post"]
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "post_123",
    "title": "My First Post",
    "content": "This is the content of my first post",
    "tags": ["introduction", "first-post"],
    "authorId": "user_123",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

## Marketplace - Products

Endpoints for creating, retrieving, updating, and deleting products in the marketplace.

### Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|--------------|-------|
| GET | `/api/products` | Get all products | No | - |
| GET | `/api/products/:id` | Get product by ID | No | - |
| POST | `/api/products` | Create new product | Yes | Seller/Admin |
| PUT | `/api/products/:id` | Update product | Yes | Owner/Admin |
| DELETE | `/api/products/:id` | Delete product | Yes | Owner/Admin |
| GET | `/api/products/user/:userId` | Get products by seller | No | - |
| GET | `/api/products/search` | Search products | No | - |
| GET | `/api/products/categories` | Get product categories | No | - |
| POST | `/api/products/:id/upload` | Upload product image | Yes | Owner/Admin |

### Example Request (Create Product)

```json
{
  "name": "Premium Widget",
  "description": "A high-quality widget for all your needs",
  "price": 29.99,
  "categoryId": "category_123",
  "images": [],
  "inventory": 50,
  "tags": ["premium", "widget"]
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "product_123",
    "name": "Premium Widget",
    "description": "A high-quality widget for all your needs",
    "price": 29.99,
    "categoryId": "category_123",
    "images": [],
    "inventory": 50,
    "tags": ["premium", "widget"],
    "sellerId": "user_123",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

## Marketplace - Orders

Endpoints for creating and managing orders in the marketplace.

### Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|--------------|-------|
| GET | `/api/orders` | Get all orders | Yes | Admin |
| GET | `/api/orders/:id` | Get order by ID | Yes | Buyer/Seller/Admin |
| POST | `/api/orders` | Create new order | Yes | Any |
| PUT | `/api/orders/:id/status` | Update order status | Yes | Seller/Admin |
| GET | `/api/orders/user` | Get current user's orders | Yes | Any |
| GET | `/api/orders/user/seller` | Get orders for current seller | Yes | Seller |
| GET | `/api/orders/stats` | Get order statistics | Yes | Admin |
| POST | `/api/orders/:id/cancel` | Cancel order | Yes | Buyer/Admin |
| POST | `/api/orders/:id/refund` | Refund order | Yes | Admin |

### Example Request (Create Order)

```json
{
  "items": [
    { 
      "productId": "product_123", 
      "quantity": 2,
      "unitPrice": 29.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "country": "US",
    "postalCode": "12345"
  }
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "order_123",
    "items": [
      { 
        "productId": "product_123", 
        "quantity": 2,
        "unitPrice": 29.99,
        "subtotal": 59.98
      }
    ],
    "buyerId": "user_123",
    "sellerId": "user_456",
    "subtotal": 59.98,
    "tax": 4.80,
    "shippingCost": 5.99,
    "total": 70.77,
    "status": "pending",
    "paymentStatus": "pending",
    "paymentIntentId": "pi_123",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "country": "US",
      "postalCode": "12345"
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

## Messaging

Endpoints for sending, receiving, and managing messages between users.

### Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|--------------|-------|
| GET | `/api/messages` | Get messages for current user | Yes | Any |
| GET | `/api/messages/conversations` | Get conversations for current user | Yes | Any |
| GET | `/api/messages/conversation/:userId` | Get conversation with specific user | Yes | Any |
| POST | `/api/messages/send/:recipientId` | Send message to user | Yes | Any |
| PUT | `/api/messages/:id/read` | Mark message as read | Yes | Recipient |
| DELETE | `/api/messages/:id` | Delete message | Yes | Sender/Recipient |
| GET | `/api/messages/unread` | Get unread message count | Yes | Any |
| PUT | `/api/messages/conversation/:userId/read` | Mark conversation as read | Yes | Any |

### Example Request (Send Message)

```json
{
  "content": "Hello, I'm interested in your product!"
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "msg_123",
    "content": "Hello, I'm interested in your product!",
    "senderId": "user_123",
    "recipientId": "user_456",
    "read": false,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

### Example Response (Get Conversations)

```json
{
  "success": true,
  "data": [
    {
      "userId": "user_456",
      "firstName": "Jane",
      "lastName": "Smith",
      "lastMessage": "Hello, I'm interested in your product!",
      "lastMessageDate": "2025-01-01T00:00:00Z",
      "unreadCount": 2
    },
    {
      "userId": "user_789",
      "firstName": "Bob",
      "lastName": "Johnson",
      "lastMessage": "Thanks for your help!",
      "lastMessageDate": "2025-01-02T00:00:00Z",
      "unreadCount": 0
    }
  ]
}
```

## Rankings

Endpoints for user reputation and ranking management.

### Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|--------------|-------|
| GET | `/api/rankings/categories` | Get all ranking categories | No | - |
| GET | `/api/rankings/users/:userId` | Get user rankings | No | - |
| GET | `/api/rankings/top/:categoryId` | Get top users by category | No | - |
| GET | `/api/rankings/top` | Get top users overall | No | - |
| POST | `/api/rankings/categories` | Create ranking category | Yes | Admin |
| PUT | `/api/rankings/users/:userId` | Update user ranking | Yes | Admin |
| PUT | `/api/rankings/adjust/:userId` | Adjust user ranking | Yes | Admin |

### Example Request (Create Category)

```json
{
  "name": "Content Quality",
  "description": "Rating for user's content quality",
  "weight": 1.5
}
```

### Example Response (User Rankings)

```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "overall": 4.7,
    "categories": [
      {
        "categoryId": "category_1",
        "name": "Content Quality",
        "score": 4.8
      },
      {
        "categoryId": "category_2",
        "name": "Response Time",
        "score": 4.6
      },
      {
        "categoryId": "category_3",
        "name": "Reliability",
        "score": 4.9
      }
    ],
    "totalRatings": 127
  }
}
```

## Engagement

Endpoints for social engagement features like likes, comments, and shares.

### Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|--------------|-------|
| GET | `/api/engagement/content/:contentId/counts` | Get engagement counts | No | - |
| GET | `/api/engagement/content/:contentId/likes` | Get likes for content | No | - |
| GET | `/api/engagement/content/:contentId/comments` | Get comments for content | No | - |
| GET | `/api/engagement/content/:contentId/shares` | Get shares for content | No | - |
| GET | `/api/engagement/comments/:commentId/replies` | Get replies to comment | No | - |
| GET | `/api/engagement/content/:contentId/hasLiked` | Check if user has liked content | Yes | Any |
| POST | `/api/engagement/content/:contentId/type/:contentType/like` | Like content | Yes | Any |
| DELETE | `/api/engagement/content/:contentId/like` | Unlike content | Yes | Any |
| POST | `/api/engagement/content/:contentId/type/:contentType/comment` | Comment on content | Yes | Any |
| POST | `/api/engagement/content/:contentId/type/:contentType/share` | Share content | Yes | Any |
| DELETE | `/api/engagement/comments/:commentId` | Delete comment | Yes | Author/Admin |

### Example Request (Add Comment)

```json
{
  "content": "This is a great post! Thanks for sharing.",
  "parentCommentId": null
}
```

### Example Response (Engagement Counts)

```json
{
  "success": true,
  "data": {
    "contentId": "post_123",
    "likes": 42,
    "comments": 7,
    "shares": 3
  }
}
```

## Payments

Endpoints for payment processing with Stripe integration.

### Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|--------------|-------|
| POST | `/api/payments/webhook` | Process Stripe webhook | No | - |
| POST | `/api/payments/intent` | Create payment intent | Yes | Any |
| GET | `/api/payments/intent/:id` | Get payment intent | Yes | Any |
| POST | `/api/payments/intent/:id/cancel` | Cancel payment intent | Yes | Any |
| POST | `/api/payments/connect/account` | Create Connect account | Yes | Any |
| POST | `/api/payments/connect/account-link` | Create account link | Yes | Any |
| GET | `/api/payments/connect/account/:accountId` | Get Connect account | Yes | Any |
| POST | `/api/payments/transfer` | Create transfer | Yes | Admin |

### Example Request (Create Payment Intent)

```json
{
  "amount": 70.77,
  "currency": "usd",
  "metadata": {
    "orderId": "order_123"
  }
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "pi_123",
    "clientSecret": "pi_123_secret_456",
    "amount": 70.77,
    "currency": "usd",
    "status": "requires_payment_method"
  }
}
```

## Error Handling

All API endpoints use consistent error handling. Errors are returned with an appropriate HTTP status code and a JSON response body containing error details.

### Example Error Response

```json
{
  "success": false,
  "message": "Resource not found",
  "error": "The requested resource could not be found"
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - The request was successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Server error |

## Rate Limiting

To protect the API from abuse, rate limiting is applied to all endpoints. The current limits are:

- 100 requests per minute for authenticated users
- 60 requests per minute for unauthenticated users

Rate limit information is included in the response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1598356800
```

## Pagination

List endpoints support pagination using `page` and `limit` query parameters.

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|--------|
| page | Page number (1-based) | 1 |
| limit | Number of items per page | 20 |
| sortBy | Field to sort by | "createdAt" |
| sortOrder | Sort order ("asc" or "desc") | "desc" |

### Example Request

```
GET /api/posts?page=2&limit=10&sortBy=title&sortOrder=asc
```

### Example Response

```json
{
  "success": true,
  "data": [
    { /* item 1 */ },
    { /* item 2 */ },
    /* ... */
  ],
  "pagination": {
    "page": 2,
    "limit": 10,
    "totalItems": 45,
    "totalPages": 5
  }
}
```
