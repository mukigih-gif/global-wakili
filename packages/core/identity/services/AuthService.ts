import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LoginInput } from '../../../common/dto/auth.dto';

const prisma = new PrismaClient();

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
  private static readonly EXPIRES_IN = '8h';

  static async login(data: LoginInput) {
    // 1. Find user within the specific Tenant (Isolation)
    const user = await prisma.user.findFirst({
      where: { 
        email: data.email,
        tenantId: data.tenantId,
        status: 'ACTIVE'
      },
      include: { tenant: true }
    });

    if (!user || !user.password) {
      throw new Error("Invalid credentials or account suspended.");
    }

    // 2. Verify Password
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error("Invalid credentials.");
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { 
        sub: user.id, 
        tenantId: user.tenantId, 
        role: user.role 
      },
      this.JWT_SECRET,
      { expiresIn: this.EXPIRES_IN }
    );

    // 4. Return user info (excluding password) and token
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization: user.tenant.name
      }
    };
  }
}