import { Router } from 'express';
import { validate } from '../../middleware/requestValidator';
import { authRequired } from '../../middleware/authRequired';
import { googleSignInSchema } from './auth.validation';
import { googleSignIn } from './controllers/googleSignIn';
import { me } from './controllers/me';

const router = Router();

router.post('/google', validate({ body: googleSignInSchema }), googleSignIn);
router.get('/me', authRequired, me);

export default router;
