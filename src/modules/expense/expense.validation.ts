import { z } from 'zod';

export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  title: z.string().min(1, 'Title is required').max(255),
  note: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  tag_ids: z.array(z.string().uuid()).default([]),
});

export const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  title: z.string().min(1).max(255).optional(),
  note: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export const expenseIdSchema = z.object({
  id: z.string().uuid('Invalid expense ID'),
});

export const expenseListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tag_ids: z.string().optional(),
});
