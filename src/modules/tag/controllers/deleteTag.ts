import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM tags WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Tag not found');
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
