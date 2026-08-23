import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { languageService } from '../services/languageService';
import { createLanguageSchema } from '../validators';

export class LanguageController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name } = createLanguageSchema.parse(req.body);
      const lang = await languageService.create(name);
      return res.status(201).json({ success: true, message: 'Language created', data: lang });
    } catch (error) {
      next(error);
    }
  }
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name } = createLanguageSchema.parse(req.body);
      const lang = await languageService.update(req.params.id, name);
      return res.json({ success: true, message: 'Language updated', data: lang });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await languageService.remove(req.params.id);
      return res.json({ success: true, message: 'Language deleted' });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await languageService.list();
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }
}

export const languageController = new LanguageController();
