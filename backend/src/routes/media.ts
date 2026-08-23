import { Router } from 'express';
import { mediaController } from '../controllers/mediaController';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

router.get('/archive', mediaController.getArchive.bind(mediaController));
router.get('/by-group/:groupId', mediaController.getByGroup.bind(mediaController));
router.get('/by-month', mediaController.getByMonth.bind(mediaController));
router.get('/by-date-range', mediaController.getByDateRange.bind(mediaController));
router.post('/', authorize('admin', 'radio_assistant'), audit('CREATE', 'Media'), mediaController.create.bind(mediaController));
router.put('/:id', authorize('admin', 'radio_assistant'), audit('UPDATE', 'Media'), mediaController.update.bind(mediaController));
router.delete('/:id', authorize('admin'), audit('DELETE', 'Media'), mediaController.delete.bind(mediaController));

export default router;
