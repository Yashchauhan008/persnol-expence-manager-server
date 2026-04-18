import { Router } from 'express';
import { validate } from '../../middleware/requestValidator';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdSchema,
} from './expense.validation';
import { listExpenses } from './controllers/listExpenses';
import { getExpense } from './controllers/getExpense';
import { createExpense } from './controllers/createExpense';
import { updateExpense } from './controllers/updateExpense';
import { deleteExpense } from './controllers/deleteExpense';

const router = Router();

router.get('/', listExpenses);
router.get('/:id', validate({ params: expenseIdSchema }), getExpense);
router.post('/', validate({ body: createExpenseSchema }), createExpense);
router.patch('/:id', validate({ params: expenseIdSchema, body: updateExpenseSchema }), updateExpense);
router.delete('/:id', validate({ params: expenseIdSchema }), deleteExpense);

export default router;
