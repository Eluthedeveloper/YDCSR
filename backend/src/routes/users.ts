import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

router.use(authenticate);
router.get('/clerks', authorize('admin', 'radio_assistant'), userController.clerks.bind(userController));
router.use(authorize('admin'));

router.get('/', userController.list.bind(userController));
router.get('/:id', userController.getById.bind(userController));
router.post('/', audit('CREATE', 'User'), userController.create.bind(userController));
router.put('/:id', audit('UPDATE', 'User'), userController.update.bind(userController));
router.delete('/:id', audit('DELETE', 'User'), userController.delete.bind(userController));

export default router;
