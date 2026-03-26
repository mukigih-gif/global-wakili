import { Router } from 'express';
import { requireSystemRole } from '../middleware/authGuard';
// Controller & Service Imports
import { SaaSController } from '../controllers/SaaSController'; 
import { OnboardingService } from '../services/OnboardingService';

const router = Router();

/**
 * ==========================================
 * SAAS ADMINISTRATION ROUTES (Your Team Only)
 * ==========================================
 * These endpoints control the global state of the "Global Wakili" platform.
 * Access is restricted to SaaS internal staff only.
 */

// 1. TENANT ONBOARDING
// Creates LawFirm -> Primary Branch -> Firm Admin in one atomic transaction.
router.post('/onboard-firm', 
  requireSystemRole(['SUPER_ADMIN']), 
  async (req, res) => {
    try {
      // Validate incoming body (firmName, adminEmail, password, etc.)
      const result = await OnboardingService.createNewTenant(req.body);
      
      res.status(201).json({ 
        success: true,
        message: "Tenant Onboarded Successfully", 
        data: {
            firmId: result.firm.id,
            adminId: result.user.id,
            branchId: result.branch.id
        }
      });
    } catch (error: any) {
      console.error(`[ONBOARDING ERROR]: ${error.message}`);
      res.status(500).json({ 
        success: false,
        error: "Onboarding failed", 
        details: error.message 
      });
    }
  }
);

// 2. TENANT DELETION
// Permanent removal of a law firm (Highly destructive - Super Admin only).
router.delete('/tenants/:firmId', 
  requireSystemRole(['SUPER_ADMIN']), 
  SaaSController.deleteTenant
);

// 3. SYSTEM AUDIT & SUPPORT
// Allows support staff to view firm logs for troubleshooting without edit rights.
router.get('/tenants/:firmId/audit-logs', 
  requireSystemRole(['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM_SUPPORT']), 
  SaaSController.viewLogs
);

export default router;