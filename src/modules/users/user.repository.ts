import { PrismaClient, User, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Type for user creation without ID and timestamps
export type CreateUserInput = {
  email: string;
  passwordHash?: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string;
  roleId: string;
};

// Type for user update
export type UpdateUserInput = Partial<CreateUserInput>;

// User with role information
export type UserWithRole = User & {
  role: Role;
};

export class UserRepository {
  /**
   * Create a new user
   */
  async create(data: CreateUserInput): Promise<User> {
    return prisma.user.create({
      data
    });
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<UserWithRole | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<UserWithRole | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });
  }

  /**
   * Update a user
   */
  async update(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id }
    });
  }

  /**
   * Find all users with optional pagination
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{ users: UserWithRole[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        include: { role: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);

    return { users, total };
  }

  /**
   * Search users by display name or email
   */
  async search(query: string, page: number = 1, limit: number = 10): Promise<{ users: UserWithRole[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { displayName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } }
          ]
        },
        skip,
        take: limit,
        include: { role: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({
        where: {
          OR: [
            { displayName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } }
          ]
        }
      })
    ]);

    return { users, total };
  }
}
