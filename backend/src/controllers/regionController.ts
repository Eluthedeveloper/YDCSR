import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { regionService } from '../services/regionService';
import { createSubRegionSchema, updateSubRegionSchema } from '../validators';

export class RegionController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createSubRegionSchema.parse(req.body);
      const region = await regionService.create(data);
      return res.status(201).json({ success: true, message: 'Region created', data: region });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateSubRegionSchema.parse(req.body);
      const region = await regionService.update(req.params.id, data);
      return res.json({ success: true, message: 'Region updated', data: region });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, regionalStateId, status } = req.query as any;
      const result = await regionService.list({
        page: Number(page) || 1, limit: Number(limit) || 50,
        search, regionalStateId, status,
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getByRegionalState(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await regionService.getByRegionalState(req.params.regionalStateId);
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await regionService.getAll();
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const region = await regionService.getById(req.params.id);
      return res.json({ success: true, data: region });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await regionService.delete(req.params.id);
      return res.json({ success: true, message: 'Region deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const regionController = new RegionController();
