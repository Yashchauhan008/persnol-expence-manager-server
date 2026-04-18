import express from 'express';
import cors from 'cors';
import apiRoutes from './app.route';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/ping', (_req, res) => {
  res.json({ message: 'pong' });
});

app.use('/api', apiRoutes);

app.use(errorHandler);

export default app;
