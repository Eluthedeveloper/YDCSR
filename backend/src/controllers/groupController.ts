import { Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { groupService } from '../services/groupService';
import { createGroupSchema, updateGroupSchema, searchGroupsSchema } from '../validators';

export class GroupController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createGroupSchema.parse(req.body);
      const group = await groupService.create({ ...data, createdBy: req.user!.userId }, req.user);
      return res.status(201).json({ success: true, message: 'Group created', data: group });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateGroupSchema.parse(req.body);
      const group = await groupService.update(req.params.id, data, req.user);
      return res.json({ success: true, message: 'Group updated', data: group });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const params = searchGroupsSchema.parse(req.query);
      const result = await groupService.list({
        page: Number(params.page),
        limit: Number(params.limit),
        search: params.search,
        regionalStateId: params.regionalStateId,
        churchId: params.churchId,
        languageId: params.languageId,
        year: params.year,
        month: params.month,
        from: params.from,
        to: params.to,
        entryFrom: params.entryFrom,
        entryTo: params.entryTo,
        createdBy: params.createdBy,
        creatorRole: params.creatorRole,
        status: params.status,
      }, req.user);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await groupService.getAll(req.user);
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async importExcel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      } catch {
        throw new AppError('File is not a valid Excel (.xlsx/.xls) or CSV file', 400);
      }
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (rows.length === 0) throw new AppError('The file contains no data rows', 400);

      const result = await groupService.importRows(rows, req.user!.userId);
      return res.json({
        success: true,
        message: `Imported ${result.imported} of ${result.imported + result.failed} rows`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const group = await groupService.getById(req.params.id, req.user);
      return res.json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  async deleteAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await groupService.deleteAll();
      return res.json({
        success: true,
        message: `Deleted ${result.groupsDeleted} groups and ${result.mediaDeleted} media items`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await groupService.delete(req.params.id);
      return res.json({ success: true, message: 'Group deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const groupController = new GroupController();
