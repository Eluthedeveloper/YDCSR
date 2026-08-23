import { Router } from 'express';
import { reportController } from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';
import { reportUpload } from '../middleware/upload';
import { audit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

router.get('/ppt', reportController.downloadPpt.bind(reportController));
router.get('/', reportController.list.bind(reportController));
router.post('/upload', authorize('admin', 'radio_assistant'), audit('CREATE', 'Report'), reportUpload.single('file'), reportController.uploadPdf.bind(reportController));
router.post('/link', authorize('admin', 'radio_assistant'), audit('CREATE', 'Report'), reportController.createLink.bind(reportController));
router.put('/:id', authorize('admin', 'radio_assistant'), audit('UPDATE', 'Report'), reportController.update.bind(reportController));
router.get('/:id/download', reportController.downloadPdf.bind(reportController));
router.delete('/:id', authorize('admin'), audit('DELETE', 'Report'), reportController.deletePdf.bind(reportController));

export default router;
