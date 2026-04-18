import { Router } from 'express';
import { getDailySummary } from './controllers/getDailySummary';
import { getMonthlySummary } from './controllers/getMonthlySummary';
import { getYearlySummary } from './controllers/getYearlySummary';

const router = Router();

router.get('/daily', getDailySummary);
router.get('/monthly', getMonthlySummary);
router.get('/yearly', getYearlySummary);

export default router;
