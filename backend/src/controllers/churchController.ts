import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { churchService } from '../services/churchService';
import { createChurchSchema, updateChurchSchema } from '../validators';

export class ChurchController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createChurchSchema.parse(req.body);
      const church = await churchService.create(data);
      return res.status(201).json({ success: true, message: 'Church created', data: church });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateChurchSchema.parse(req.body);
      const church = await churchService.update(req.params.id, data);
      return res.json({ success: true, message: 'Church updated', data: church });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, regionId, status } = req.query as any;
      const result = await churchService.list({
        page: Number(page) || 1, limit: Number(limit) || 20, search, regionId, status,
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await churchService.getAll();
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const church = await churchService.getById(req.params.id);
      return res.json({ success: true, data: church });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await churchService.delete(req.params.id);
      return res.json({ success: true, message: 'Church deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const churchController = new ChurchController();
