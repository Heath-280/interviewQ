import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadResume } from '../../middleware/upload';
import * as controller from './resume.controller';

const router = Router();

router.use(authenticate);

const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid resume id') });

router.post('/', uploadResume, controller.upload);
router.get('/', controller.list);
router.get('/:id', validate({ params: idParam }), controller.getOne);
router.get('/:id/download', validate({ params: idParam }), controller.download);
router.patch('/:id/primary', validate({ params: idParam }), controller.setPrimary);
router.delete('/:id', validate({ params: idParam }), controller.remove);

export default router;
