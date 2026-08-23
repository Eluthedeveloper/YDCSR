import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { mediaService } from '../services/mediaService';
import { createMediaSchema, updateMediaSchema } from '../validators';

export class MediaController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createMediaSchema.parse(req.body);
      const item = await mediaService.create({ ...data, createdBy: req.user!.userId });
      return res.status(201).json({ success: true, message: 'Media added', data: item });
    } catch (error) {
      next(error);
    }
  }

  async getByGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await mediaService.getByGroup(req.params.groupId);
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async getByMonth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year);
      const month = Number(req.query.month);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ success: false, message: 'Invalid year' });
      }
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: 'Invalid month' });
      }
      const type = req.query.type as string | undefined;
      const items = await mediaService.getByMonth(year, month, type);
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async getByDateRange(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, type } = req.query as any;
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate required' });
      }
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid startDate or endDate' });
      }
      const items = await mediaService.getByDateRange(startDate, endDate, type);
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async getArchive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const startDate = typeof req.query.startDate === 'string' && req.query.startDate ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' && req.query.endDate ? req.query.endDate : undefined;

      if (page !== undefined && (!Number.isInteger(page) || page < 1 || page > 10000)) {
        return res.status(400).json({ success: false, message: 'Invalid page' });
      }

      if ((startDate && !endDate) || (!startDate && endDate)) {
        return res.status(400).json({ success: false, message: 'Both startDate and endDate are required' });
      }

      const result = await mediaService.getArchive({ page, startDate, endDate });
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await mediaService.delete(req.params.id);
      return res.json({ success: true, message: 'Media deleted' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateMediaSchema.parse(req.body);
      const item = await mediaService.update(req.params.id, data, req.user);
      return res.json({ success: true, message: 'Media updated', data: item });
    } catch (error) {
      next(error);
    }
  }
}

export const mediaController = new MediaController();
