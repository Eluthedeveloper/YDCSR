import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const adminOnly = authorize('admin');

router.use(authenticate);

// Recent activity feeds the admin notification bell only.
router.get('/recent', adminOnly, auditController.recent.bind(auditController));

router.get('/', adminOnly, auditController.list.bind(auditController));
router.get('/logins', adminOnly, auditController.logins.bind(auditController));

// Registered before '/:id' so 'activity' is never treated as an id.
router.delete('/activity/all', adminOnly, auditController.deleteAllActivity.bind(auditController));
router.delete('/all', adminOnly, auditController.deleteAllLogins.bind(auditController));
router.delete('/', adminOnly, auditController.deleteMany.bind(auditController));
router.delete('/:id', adminOnly, auditController.delete.bind(auditController));

export default router;
