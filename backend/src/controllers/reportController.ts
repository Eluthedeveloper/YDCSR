import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { pptService } from '../services/pptService';
import { reportService } from '../services/reportService';
import { AppError } from '../middleware/errorHandler';
import { verifyFileSignature } from '../middleware/upload';
import { createReportLinkSchema, updateReportSchema } from '../validators';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

export class ReportController {
  async downloadPpt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year);
      const month = Number(req.query.month);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ success: false, message: 'Invalid year' });
      }
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: 'Invalid month' });
      }

      const buffer = await pptService.generateMonthlyReport(year, month);

      const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
      const filename = `ydcs-report-${year}-${String(month).padStart(2, '0')}.pptx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const month = req.query.month ? Number(req.query.month) : undefined;
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const items = await reportService.list({ year, month, startDate, endDate });
      return res.json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async uploadPdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);

      const filePath = path.join(config.upload.dir, 'reports', req.file.filename);
      if (!verifyFileSignature(filePath, 'application/pdf')) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw new AppError('File is not a valid PDF', 400);
      }

      const title = ((req.body.title || '').toString().trim().slice(0, 255)) || 'Untitled Report';

      let reportDate: string | undefined;
      const year = Number(req.body.year);
      const month = Number(req.body.month);
      if (Number.isInteger(year) && year >= 2000 && year <= 2100 &&
          Number.isInteger(month) && month >= 1 && month <= 12) {
        reportDate = new Date(year, month - 1, 1).toISOString();
      }

      const item = await reportService.create({
        title,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        reportDate,
        createdBy: req.user!.userId,
      });

      return res.status(201).json({ success: true, message: 'Report posted', data: item });
    } catch (error) {
      next(error);
    }
  }

  async createLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createReportLinkSchema.parse(req.body);

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(data.url);
      } catch {
        throw new AppError('Invalid link', 400);
      }
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        throw new AppError('Link must start with http:// or https://', 400);
      }

      const title = ((data.title || '').toString().trim().slice(0, 255)) || 'Untitled Report';

      let reportDate: string | undefined;
      if (Number.isInteger(data.year) && Number.isInteger(data.month)) {
        reportDate = new Date(data.year!, data.month! - 1, 1).toISOString();
      }

      const item = await reportService.create({
        title,
        sourceType: 'link',
        externalUrl: data.url,
        reportDate,
        createdBy: req.user!.userId,
      });

      return res.status(201).json({ success: true, message: 'Report link posted', data: item });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateReportSchema.parse(req.body);
      if (data.title === undefined && data.reportDate === undefined) {
        throw new AppError('Nothing to update', 400);
      }
      const item = await reportService.update(req.params.id, data);
      return res.json({ success: true, message: 'Report updated', data: item });
    } catch (error) {
      next(error);
    }
  }

  async downloadPdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await reportService.getById(req.params.id);
      if (!item) throw new AppError('Report not found', 404);
      if (item.sourceType === 'link') throw new AppError('This report is an external link - open it from the link button instead', 400);
      if (!item.fileName) throw new AppError('Report file missing', 404);

      const filePath = path.join(process.cwd(), config.upload.dir, 'reports', item.fileName);
      if (!fs.existsSync(filePath)) throw new AppError('Report file missing', 404);

      const originalName = ((item.originalName || 'report.pdf') as string).replace(/[\r\n"\\;]+/g, '').replace(/[^\x20-\x7E]/g, '').trim() || 'report.pdf';

      res.setHeader('Content-Type', item.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }

  async deletePdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await reportService.remove(req.params.id);
      if (item.fileName) {
        const filePath = path.join(process.cwd(), config.upload.dir, 'reports', item.fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.json({ success: true, message: 'Report deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
