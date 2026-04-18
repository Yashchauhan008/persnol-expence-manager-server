import { Router } from 'express';
import { validate } from '../../middleware/requestValidator';
import {
  createIncomeSchema,
  updateIncomeSchema,
  incomeIdSchema,
} from './income.validation';
import { listIncomes } from './controllers/listIncomes';
import { getIncome } from './controllers/getIncome';
import { createIncome } from './controllers/createIncome';
import { updateIncome } from './controllers/updateIncome';
import { deleteIncome } from './controllers/deleteIncome';

const router = Router();

router.get('/', listIncomes);
router.get('/:id', validate({ params: incomeIdSchema }), getIncome);
router.post('/', validate({ body: createIncomeSchema }), createIncome);
router.patch('/:id', validate({ params: incomeIdSchema, body: updateIncomeSchema }), updateIncome);
router.delete('/:id', validate({ params: incomeIdSchema }), deleteIncome);

export default router;
