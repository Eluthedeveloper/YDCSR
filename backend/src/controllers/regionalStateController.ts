import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { regionalStateService } from '../services/regionalStateService';
import { createRegionSchema, updateRegionSchema } from '../validators';

export class RegionalStateController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createRegionSchema.parse(req.body);
      const rs = await regionalStateService.create(data);
      return res.status(201).json({ success: true, message: 'Regional state created', data: rs });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateRegionSchema.parse(req.body);
      const rs = await regionalStateService.update(req.params.id, data);
      return res.json({ success: true, message: 'Regional state updated', data: rs });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, status } = req.query as any;
      const result = await regionalStateService.list({ page: Number(page) || 1, limit: Number(limit) || 50, search, status });
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await regionalStateService.getAll();
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rs = await regionalStateService.getById(req.params.id);
      return res.json({ success: true, data: rs });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await regionalStateService.delete(req.params.id);
      return res.json({ success: true, message: 'Regional state deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const regionalStateController = new RegionalStateController();
