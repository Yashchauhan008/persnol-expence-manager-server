import { z } from 'zod';

export const createIncomeSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  source: z.string().min(1, 'Source is required').max(255),
  note: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  chart_visibility: z.boolean().default(true),
});

export const updateIncomeSchema = z.object({
  amount: z.number().positive().optional(),
  source: z.string().min(1).max(255).optional(),
  note: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  chart_visibility: z.boolean().optional(),
});

export const incomeIdSchema = z.object({
  id: z.string().uuid('Invalid income ID'),
});

export const incomeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
