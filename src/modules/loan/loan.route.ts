import { Router } from 'express';
import { validate } from '../../middleware/requestValidator';
import {
  createLoanSchema,
  updateLoanSchema,
  settleLoanSchema,
  loanIdSchema,
} from './loan.validation';
import { listLoans } from './controllers/listLoans';
import { getLoan } from './controllers/getLoan';
import { createLoan } from './controllers/createLoan';
import { updateLoan } from './controllers/updateLoan';
import { deleteLoan } from './controllers/deleteLoan';
import { settlePartialLoan } from './controllers/settlePartialLoan';

const router = Router();

router.get('/', listLoans);
router.get('/:id', validate({ params: loanIdSchema }), getLoan);
router.post('/', validate({ body: createLoanSchema }), createLoan);
router.patch('/:id', validate({ params: loanIdSchema, body: updateLoanSchema }), updateLoan);
router.delete('/:id', validate({ params: loanIdSchema }), deleteLoan);
router.post('/:id/settle', validate({ params: loanIdSchema, body: settleLoanSchema }), settlePartialLoan);

export default router;
