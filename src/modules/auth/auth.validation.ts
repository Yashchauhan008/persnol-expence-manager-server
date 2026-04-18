import { z } from 'zod';

export const googleSignInSchema = z.object({
  id_token: z.string().min(1, 'Google credential is required'),
});
