import { Router } from 'express';
import tagRoutes from './modules/tag/tag.route';
import incomeRoutes from './modules/income/income.route';
import expenseRoutes from './modules/expense/expense.route';
import loanRoutes from './modules/loan/loan.route';
import summaryRoutes from './modules/summary/summary.route';

const router = Router();

router.use('/tags', tagRoutes);
router.use('/incomes', incomeRoutes);
router.use('/expenses', expenseRoutes);
router.use('/loans', loanRoutes);
router.use('/summary', summaryRoutes);

export default router;
