import { Router } from "express";
import { enforceTenantProxy } from "../../lib/repository";

const router = Router();

/**
 * Updates Firm Branding and Compliance Flags.
 * Scoped automatically by the Tenant Proxy.
 */
router.patch("/branding", async (req, res) => {
  const db = enforceTenantProxy(req);
  const { primaryColor, accentColor, logoUrl, enableEtims } = req.body;

  try {
    const updated = await db.tenant.update({
      where: { id: req.tenant?.id },
      data: { 
        primaryColor, 
        accentColor, 
        logoUrl,
        enableEtims 
      },
    });

    res.json({ status: "success", data: updated });
  } catch (error: any) {
    res.status(403).json({ status: "error", message: "Unauthorized branding update." });
  }
});

export default router;