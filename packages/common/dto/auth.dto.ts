import { z } from 'zod';

// Schema for the initial Law Firm Registration
export const RegisterFirmSchema = z.object({
  firmName: z.string().min(2, "Firm name is required"),
  adminName: z.string().min(2, "Admin name is required"),
  adminEmail: z.string().email("Invalid email address format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  kraPin: z.string().min(5, "KRA PIN is required"),
  mainBranchName: z.string().default("Headquarters"),
});

// Schema for standard User Login
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Export TypeScript types inferred from the schemas
export type RegisterFirmInput = z.infer<typeof RegisterFirmSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;