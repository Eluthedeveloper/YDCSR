import { Router } from 'express';
import { regionalStateController } from '../controllers/regionalStateController';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

router.get('/', regionalStateController.list.bind(regionalStateController));
router.get('/all', regionalStateController.getAll.bind(regionalStateController));
router.get('/:id', regionalStateController.getById.bind(regionalStateController));
router.post('/', authorize('admin'), audit('CREATE', 'RegionalState'), regionalStateController.create.bind(regionalStateController));
router.put('/:id', authorize('admin'), audit('UPDATE', 'RegionalState'), regionalStateController.update.bind(regionalStateController));
router.delete('/:id', authorize('admin'), audit('DELETE', 'RegionalState'), regionalStateController.delete.bind(regionalStateController));

export default router;
