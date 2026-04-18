import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Expense not found');
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
