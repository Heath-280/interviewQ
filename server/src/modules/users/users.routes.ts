import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { changePasswordSchema, updateProfileSchema } from '../auth/auth.validation';
import * as controller from './users.controller';

const router = Router();

router.use(authenticate);

router.patch('/me', validate({ body: updateProfileSchema }), controller.updateProfile);
router.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);

// Admin-only routes
router.get('/', authorize('admin'), controller.listUsers);
router.patch(
  '/:id/role',
  authorize('admin'),
  validate({ body: z.object({ role: z.enum(['user', 'admin']) }) }),
  controller.setRole,
);
router.delete('/:id', authorize('admin'), controller.deleteUser);

export default router;
