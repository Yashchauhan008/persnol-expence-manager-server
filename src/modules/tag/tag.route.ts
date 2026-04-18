import { Router } from 'express';
import { validate } from '../../middleware/requestValidator';
import { createTagSchema, updateTagSchema, tagIdSchema } from './tag.validation';
import { listTags } from './controllers/listTags';
import { createTag } from './controllers/createTag';
import { updateTag } from './controllers/updateTag';
import { deleteTag } from './controllers/deleteTag';

const router = Router();

router.get('/', listTags);
router.post('/', validate({ body: createTagSchema }), createTag);
router.patch('/:id', validate({ params: tagIdSchema, body: updateTagSchema }), updateTag);
router.delete('/:id', validate({ params: tagIdSchema }), deleteTag);

export default router;
