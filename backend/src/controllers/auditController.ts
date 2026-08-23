import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { auditService } from '../services/auditService';

export class AuditController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search, action, entity, userId, from, to } = req.query as any;
      const result = await auditService.list({
        page: Number(page), limit: Number(limit), search, action, entity, userId, from, to,
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async logins(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search, from, to } = req.query as any;
      const result = await auditService.logins({
        page: Number(page), limit: Number(limit), search, from, to,
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async recent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 10;
      const items = await auditService.recent(limit);
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deleted = await auditService.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
      }
      return res.json({ success: true, message: 'Audit log deleted' });
    } catch (error) {
      next(error);
    }
  }

  async deleteMany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body as { ids?: string[] };
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required' });
      }
      const deleted = await auditService.deleteMany(ids);
      return res.json({ success: true, message: `${deleted} audit log(s) deleted`, deleted });
    } catch (error) {
      next(error);
    }
  }

  async deleteAllLogins(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deleted = await auditService.deleteLogins();
      return res.json({ success: true, message: `${deleted} login history record(s) deleted`, deleted });
    } catch (error) {
      next(error);
    }
  }

  // Deletes the entire activity trail. Intentionally NOT audit-logged,
  // otherwise one row would always survive and look like a failed wipe.
  async deleteAllActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deleted = await auditService.deleteAll();
      return res.json({ success: true, message: `${deleted} activity record(s) deleted`, deleted });
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
