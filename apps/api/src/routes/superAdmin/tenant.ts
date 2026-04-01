import { Router } from "express";
import prisma from "../../prisma/client";
import { AppError } from "../../utils/AppError";

const router = Router();

/**
 * @route   POST /api/v1/super-admin/tenants/onboard
 * @desc    Atomic onboarding for new Law Firms
 * @access  Super Admin Only (Global Sites Ltd)
 */
router.post("/onboard", async (req, res, next) => {
  try {
    const { 
      name, 
      slug, 
      ownerId, 
      plan, 
      kraPin 
    } = req.body ?? {};

    // 1. Strict Validation
    if (!name || !slug || !ownerId) {
      throw new AppError("System Failure: name, slug, and ownerId are non-negotiable.", 400);
    }

    // 2. Atomic Transaction (The "Concrete Grid" Lock)
    // Using the hardened singleton imported from ../../prisma/client
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Create the Tenant with full tax and billing metadata
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug: slug.toLowerCase(),
          kraPin, // Essential for eTIMS compliance
          subscriptionPlan: plan || "BASIC",
          subscriptionStatus: "ACTIVE",
          billingCycleStart: new Date(),
          // Automatic 1-year cycle calculation
          billingCycleEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
      });

      // B. Create the Owner Membership immediately
      // This ensures the firm is never without an admin
      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: ownerId,
          role: "OWNER",
          isOwner: true,
        },
      });

      return tenant;
    });

    // 3. Response handling
    res.status(201).json({
      status: "success",
      message: "Law Firm infrastructure provisioned successfully.",
      data: result,
    });

  } catch (err) {
    // Passes to the Global Error Middleware for PII scrubbing
    next(err);
  }
});

/**
 * @route   GET /api/v1/super-admin/tenants
 * @desc    Global list for system monitoring
 */
router.get("/", async (_req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    res.json({ status: "success", data: tenants });
  } catch (err) {
    next(err);
  }
});

export default router;