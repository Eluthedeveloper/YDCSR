import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { userService } from '../services/userService';
import { createUserSchema, updateUserSchema } from '../validators';

export class UserController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await userService.create(data);
      return res.status(201).json({ success: true, message: 'User created', data: user });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await userService.update(req.params.id, data, req.user!.userId);
      return res.json({ success: true, message: 'User updated', data: user });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search, role, status } = req.query as any;
      const result = await userService.list({
        page: Number(page), limit: Number(limit), search, role, status,
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async clerks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await userService.listClerks();
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getById(req.params.id);
      return res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.delete(req.params.id, req.user!.userId);
      return res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
