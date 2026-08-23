import { Router } from 'express';
import { churchController } from '../controllers/churchController';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

router.get('/', churchController.list.bind(churchController));
router.get('/all', churchController.getAll.bind(churchController));
router.get('/:id', churchController.getById.bind(churchController));
router.post('/', authorize('admin'), audit('CREATE', 'Church'), churchController.create.bind(churchController));
router.put('/:id', authorize('admin'), audit('UPDATE', 'Church'), churchController.update.bind(churchController));
router.delete('/:id', authorize('admin'), audit('DELETE', 'Church'), churchController.delete.bind(churchController));

export default router;
