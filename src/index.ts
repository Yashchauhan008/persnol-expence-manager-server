import { env } from './config/env';
import app from './app';
import pool from './service/database';

const PORT = env.PORT;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection established');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
