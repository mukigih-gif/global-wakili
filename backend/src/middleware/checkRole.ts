// backend/middleware/checkRole.ts

export const canOpenFile = (user) => {
  const allowed = ['SUPER_ADMIN', 'MANAGING_PARTNER', 'SECRETARY_PA', 'OFFICE_ADMIN'];
  return allowed.includes(user.role);
};

export const canFinalizeInvoice = (user) => {
  const allowed = ['MANAGING_PARTNER', 'ACCOUNTANT'];
  return allowed.includes(user.role);
};