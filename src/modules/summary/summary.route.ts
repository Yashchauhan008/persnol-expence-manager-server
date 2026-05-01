import { Router } from 'express';
import { getDailySummary } from './controllers/getDailySummary';
import { getMonthlySummary } from './controllers/getMonthlySummary';
import { getYearlySummary } from './controllers/getYearlySummary';
import { getRangeSummary } from './controllers/getRangeSummary';

const router = Router();

router.get('/daily', getDailySummary);
router.get('/monthly', getMonthlySummary);
router.get('/yearly', getYearlySummary);
router.get('/range', getRangeSummary);

export default router;
