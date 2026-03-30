import { z } from 'zod';

export const CreateMatterSchema = z.object({
  title: z.string().min(3, "Matter title is too short"),
  description: z.string().optional(),
  clientName: z.string().min(1, "Client name is required"), // Simplified for now
  practiceArea: z.string().default('GENERAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export type CreateMatterInput = z.infer<typeof CreateMatterSchema>;