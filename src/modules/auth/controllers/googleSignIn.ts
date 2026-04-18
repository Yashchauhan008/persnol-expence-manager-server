import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../../../service/database';
import { env } from '../../../config/env';
import { ServerError } from '../../../core/ServerError.class';
import { ErrorCode } from '../../../config/errorCode';
import { signToken } from '../jwt';
import { ensureDefaultTagsForUser } from '../../tag/seedDefaultTags';

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
};

function buildAuthResponse(user: UserRow, token: string) {
  return {
    success: true as const,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      },
    },
  };
}

async function sendAuthResponse(res: Response, user: UserRow): Promise<void> {
  await ensureDefaultTagsForUser(user.id);
  const token = signToken(user.id, user.email);
  res.json(buildAuthResponse(user, token));
}

export async function googleSignIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id_token } = req.body as { id_token: string };

    if (!env.GOOGLE_CLIENT_ID) {
      throw new ServerError(
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Google sign-in is not configured (GOOGLE_CLIENT_ID)'
      );
    }

    const oauthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    const ticket = await oauthClient.verifyIdToken({
      idToken: id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new ServerError(400, ErrorCode.BAD_REQUEST, 'Invalid Google token');
    }

    const email = payload.email.toLowerCase();
    const googleSub = payload.sub;
    const displayName = payload.name?.trim() || null;

    const byGoogle = await query<UserRow>(
      'SELECT id, email, display_name FROM users WHERE google_sub = $1',
      [googleSub]
    );

    if (byGoogle.rowCount && byGoogle.rows[0]) {
      const user = byGoogle.rows[0];
      await sendAuthResponse(res, user);
      return;
    }

    const byEmail = await query<{
      id: string;
      email: string;
      display_name: string | null;
      google_sub: string | null;
    }>(
      'SELECT id, email, display_name, google_sub FROM users WHERE email = $1',
      [email]
    );

    if (byEmail.rowCount && byEmail.rows[0]) {
      const row = byEmail.rows[0];

      if (row.google_sub === googleSub) {
        const user: UserRow = {
          id: row.id,
          email: row.email,
          display_name: row.display_name,
        };
        await sendAuthResponse(res, user);
        return;
      }

      if (row.google_sub) {
        throw new ServerError(
          409,
          ErrorCode.CONFLICT,
          'This email is already linked to a different Google account'
        );
      }

      await query(
        `UPDATE users
         SET google_sub = $1,
             display_name = COALESCE($2, display_name),
             updated_at = NOW()
         WHERE id = $3`,
        [googleSub, displayName, row.id]
      );
      const refreshed = await query<UserRow>(
        'SELECT id, email, display_name FROM users WHERE id = $1',
        [row.id]
      );
      const user = refreshed.rows[0];
      await sendAuthResponse(res, user);
      return;
    }

    const inserted = await query<UserRow>(
      `INSERT INTO users (email, display_name, google_sub, password_hash)
       VALUES ($1, $2, $3, NULL)
       RETURNING id, email, display_name`,
      [email, displayName, googleSub]
    );

    const user = inserted.rows[0];
    await sendAuthResponse(res, user);
  } catch (err) {
    next(err);
  }
}
