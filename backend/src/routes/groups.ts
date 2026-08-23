import { Router } from 'express';
import { groupController } from '../controllers/groupController';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { importUpload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', groupController.list.bind(groupController));
router.get('/all', groupController.getAll.bind(groupController));
router.get('/:id', groupController.getById.bind(groupController));
router.post('/import', authorize('admin'), importUpload.single('file'), audit('IMPORT', 'RadioHomeGroup'), groupController.importExcel.bind(groupController));
router.post('/', authorize('admin', 'data_entry', 'radio_assistant'), audit('CREATE', 'RadioHomeGroup'), groupController.create.bind(groupController));
router.put('/:id', authorize('admin', 'data_entry', 'radio_assistant'), audit('UPDATE', 'RadioHomeGroup'), groupController.update.bind(groupController));
router.delete('/all', authorize('admin'), audit('DELETE_ALL', 'RadioHomeGroup'), groupController.deleteAll.bind(groupController));
router.delete('/:id', authorize('admin', 'radio_assistant'), audit('DELETE', 'RadioHomeGroup'), groupController.delete.bind(groupController));

export default router;
