import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('admin', 'radio_assistant', 'viewer'));

router.get('/stats', dashboardController.stats.bind(dashboardController));
router.get('/groups-by-regional-state', dashboardController.groupsByRegionalState.bind(dashboardController));
router.get('/groups-by-language', dashboardController.groupsByLanguage.bind(dashboardController));
router.get('/monthly-groups', dashboardController.monthlyGroups.bind(dashboardController));
router.get('/radios-by-month', dashboardController.radiosByMonth.bind(dashboardController));
router.get('/agreements-by-month', dashboardController.agreementsByMonth.bind(dashboardController));
router.get('/members-by-gender', dashboardController.memberByGender.bind(dashboardController));
router.get('/stats-by-regional-state', dashboardController.statsByRegionalState.bind(dashboardController));

router.use(authorize('admin', 'radio_assistant'));
router.get('/radios-by-regional-state', dashboardController.radiosByRegionalState.bind(dashboardController));
router.get('/radios-by-facilitator', dashboardController.radiosByFacilitator.bind(dashboardController));

export default router;
