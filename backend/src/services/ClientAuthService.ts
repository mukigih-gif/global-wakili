// src/services/ClientAuthService.ts
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();

export class ClientAuthService {
  /**
   * Step 1: Request Access (Sends OTP)
   */
  static async requestAccess(email: string) {
    const client = await prisma.client.findUnique({
      where: { email },
      include: { portalAccess: true }
    });

    if (!client || !client.portalAccess?.isActive) {
      throw new Error("Access denied or client not found.");
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); // 10 mins

    await prisma.clientPortalAccess.update({
      where: { clientId: client.id },
      data: { 
        otpToken: otp, // Ensure you add this field to your model
        otpExpiry: expiry 
      }
    });

    // Tiered Notification Dispatch
    // 1. System (Internal Log) -> 2. Email -> 3. SMS (Optional)
    await NotificationService.sendMultiChannelAlert({
      userId: client.id,
      title: "Portal Access Code",
      message: `Your Global Wakili access code is: ${otp}`,
      email: client.email,
      phone: client.phone,
      includeSMS: false // Firm can toggle this based on cost
    });

    return { message: "OTP sent to registered devices." };
  }

  /**
   * Step 2: Verify OTP and Grant JWT
   */
  static async verifyAccess(email: string, otp: string) {
    const access = await prisma.clientPortalAccess.findFirst({
      where: { 
        client: { email },
        otpToken: otp,
        otpExpiry: { gte: new Date() }
      }
    });

    if (!access) throw new Error("Invalid or expired code.");

    // Generate Session Token
    const token = jwt.sign(
      { clientId: access.clientId, role: 'CLIENT_PORTAL' },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' }
    );

    return { token, clientId: access.clientId };
  }
}