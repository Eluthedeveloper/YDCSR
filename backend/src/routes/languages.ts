import { Router } from 'express';
import { languageController } from '../controllers/languageController';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

router.get('/', languageController.list.bind(languageController));
router.post('/', authorize('admin'), audit('CREATE', 'Language'), languageController.create.bind(languageController));
router.put('/:id', authorize('admin'), audit('UPDATE', 'Language'), languageController.update.bind(languageController));
router.delete('/:id', authorize('admin'), audit('DELETE', 'Language'), languageController.remove.bind(languageController));

export default router;
