import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as controller from './ai.controller';

const router = Router();

router.get('/status', authenticate, controller.status);

export default router;
