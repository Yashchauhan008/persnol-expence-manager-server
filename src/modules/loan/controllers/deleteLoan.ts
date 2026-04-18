import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function deleteLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await query('DELETE FROM loans WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Loan not found');
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
