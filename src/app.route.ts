import { Router } from 'express';
import { authRequired } from './middleware/authRequired';
import authRoutes from './modules/auth/auth.route';
import tagRoutes from './modules/tag/tag.route';
import incomeRoutes from './modules/income/income.route';
import expenseRoutes from './modules/expense/expense.route';
import loanRoutes from './modules/loan/loan.route';
import summaryRoutes from './modules/summary/summary.route';

const router = Router();

router.use('/auth', authRoutes);

const protectedRoutes = Router();
protectedRoutes.use(authRequired);
protectedRoutes.use('/tags', tagRoutes);
protectedRoutes.use('/incomes', incomeRoutes);
protectedRoutes.use('/expenses', expenseRoutes);
protectedRoutes.use('/loans', loanRoutes);
protectedRoutes.use('/summary', summaryRoutes);

router.use(protectedRoutes);

export default router;
