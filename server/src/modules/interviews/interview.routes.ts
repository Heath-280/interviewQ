import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import * as controller from './interview.controller';
import {
  createInterviewSchema,
  followUpAnswerSchema,
  listInterviewsSchema,
  submitAnswerSchema,
} from './interview.validation';

const router = Router();

router.use(authenticate);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });
const questionParam = z.object({ id: objectId, questionId: objectId });
const followUpParam = z.object({ id: objectId, questionId: objectId, followUpId: objectId });

router.post('/', aiLimiter, validate({ body: createInterviewSchema }), controller.create);
router.get('/', validate({ query: listInterviewsSchema }), controller.list);
router.get('/:id', validate({ params: idParam }), controller.getOne);

router.post(
  '/:id/questions/:questionId/answer',
  aiLimiter,
  validate({ params: questionParam, body: submitAnswerSchema }),
  controller.submitAnswer,
);
router.post(
  '/:id/questions/:questionId/follow-up',
  aiLimiter,
  validate({ params: questionParam }),
  controller.requestFollowUp,
);
router.post(
  '/:id/questions/:questionId/follow-up/:followUpId/answer',
  aiLimiter,
  validate({ params: followUpParam, body: followUpAnswerSchema }),
  controller.answerFollowUp,
);

router.post(
  '/:id/complete',
  aiLimiter,
  validate({ params: idParam }),
  controller.complete,
);
router.get('/:id/report', validate({ params: idParam }), controller.report);
router.get('/:id/report.json', validate({ params: idParam }), controller.reportJson);
router.delete('/:id', validate({ params: idParam }), controller.remove);

export default router;
