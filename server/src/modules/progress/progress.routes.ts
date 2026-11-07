import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as controller from './progress.controller';

const router = Router();

router.get('/', authenticate, controller.overview);

export default router;
