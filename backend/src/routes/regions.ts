import { Router } from 'express';
import { regionController } from '../controllers/regionController';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

router.get('/', regionController.list.bind(regionController));
router.get('/by-regional-state/:regionalStateId', regionController.getByRegionalState.bind(regionController));
router.get('/all', regionController.getAll.bind(regionController));
router.get('/:id', regionController.getById.bind(regionController));
router.post('/', authorize('admin'), audit('CREATE', 'Region'), regionController.create.bind(regionController));
router.put('/:id', authorize('admin'), audit('UPDATE', 'Region'), regionController.update.bind(regionController));
router.delete('/:id', authorize('admin'), audit('DELETE', 'Region'), regionController.delete.bind(regionController));

export default router;
