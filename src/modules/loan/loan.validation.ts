import { z } from 'zod';

export const createLoanSchema = z.object({
  type: z.enum(['given', 'taken']),
  person_name: z.string().min(1, 'Person name is required').max(255),
  amount: z.number().positive('Amount must be positive'),
  note: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const updateLoanSchema = z.object({
  person_name: z.string().min(1).max(255).optional(),
  note: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const settleLoanSchema = z.object({
  amount: z.number().positive('Settlement amount must be positive'),
  note: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const loanIdSchema = z.object({
  id: z.string().uuid('Invalid loan ID'),
});

export const loanListQuerySchema = z.object({
  type: z.enum(['given', 'taken']).optional(),
  status: z.enum(['pending', 'partial', 'settled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});
