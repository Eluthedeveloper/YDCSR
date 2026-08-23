import { Router } from 'express';
import { settingsController } from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', settingsController.get.bind(settingsController));
router.put('/', audit('UPDATE', 'Setting'), settingsController.update.bind(settingsController));

export default router;
