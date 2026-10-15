import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { dashboardService } from '../services/dashboardService';

export class DashboardController {
  async stats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getStats();
      // Viewers count is admin-only; strip it for every other role
      if (req.user?.role !== 'admin') {
        const { totalViewers, ...rest } = stats;
        return res.json({ success: true, data: rest });
      }
      return res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async groupsByRegionalState(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getGroupsByRegionalState();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async groupsByLanguage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getGroupsByLanguage();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async monthlyGroups(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const data = await dashboardService.getMonthlyGroups(year);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async radiosByMonth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const data = await dashboardService.getRadiosByMonth(year);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async agreementsByMonth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const data = await dashboardService.getAgreementsByMonth(year);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async memberByGender(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getMemberByGender();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async radiosByRegionalState(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getRadiosByRegionalState();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async radiosByFacilitator(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getRadiosByFacilitator();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async statsByRegionalState(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getStatsByRegionalState();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
