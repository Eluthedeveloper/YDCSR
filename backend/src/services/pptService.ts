import PptxGenJS from 'pptxgenjs';
import { getDb } from '../db/connection';
import { radioHomeGroups, regions, regionalStates, languages, churches, media } from '../db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

const COLORS = ['3B82F6', 'EF4444', '22C55E', 'F59E0B', '8B5CF6', 'EC4899', '14B8A6', 'F97316'];

export class PptService {
  async generateMonthlyReport(year: number, month: number): Promise<Buffer> {
    const db = getDb();
    const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const groups = await db.select({
      id: radioHomeGroups.id,
      serialNumber: radioHomeGroups.serialNumber,
      dateStarted: radioHomeGroups.dateStarted,
      regionId: radioHomeGroups.regionId,
      regionName: regions.name,
      regionCode: regionalStates.code,
      languageId: radioHomeGroups.languageId,
      languageName: languages.name,
      churchId: radioHomeGroups.churchId,
      churchName: churches.name,
      groupLeaderName: radioHomeGroups.groupLeaderName,
      groupLeaderPhone: radioHomeGroups.groupLeaderPhone,
      facilitatorName: radioHomeGroups.facilitatorName,
      facilitatorPhone: radioHomeGroups.facilitatorPhone,
      maleMembers: radioHomeGroups.maleMembers,
      femaleMembers: radioHomeGroups.femaleMembers,
      totalMembers: radioHomeGroups.totalMembers,
      radioGiven: radioHomeGroups.radioGiven,
      agreementMade: radioHomeGroups.agreementMade,
      remark: radioHomeGroups.remark,
      status: radioHomeGroups.status,
    }).from(radioHomeGroups)
      .leftJoin(regions, eq(radioHomeGroups.regionId, regions.id))
      .leftJoin(regionalStates, eq(regions.regionalStateId, regionalStates.id))
      .leftJoin(languages, eq(radioHomeGroups.languageId, languages.id))
      .leftJoin(churches, eq(radioHomeGroups.churchId, churches.id))
      .where(
        and(
          gte(radioHomeGroups.dateStarted, startDate),
          lte(radioHomeGroups.dateStarted, endDate)
        )
      )
      .orderBy(radioHomeGroups.serialNumber);

    const mediaItems = await db.select({
      id: media.id,
      groupId: media.groupId,
      type: media.type,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      title: media.title,
      description: media.description,
      dateTaken: media.dateTaken,
      createdAt: media.createdAt,
      groupSerialNumber: radioHomeGroups.serialNumber,
    }).from(media)
      .leftJoin(radioHomeGroups, eq(media.groupId, radioHomeGroups.id))
      .where(
        and(
          sql`${media.dateTaken} >= ${startDate}`,
          sql`${media.dateTaken} <= ${endDate}`
        )
      )
      .orderBy(media.dateTaken);

    const totals = groups.reduce((acc, g) => ({
      male: acc.male + g.maleMembers,
      female: acc.female + g.femaleMembers,
      total: acc.total + g.totalMembers,
      radios: acc.radios + g.radioGiven,
      agreements: acc.agreements + g.agreementMade,
    }), { male: 0, female: 0, total: 0, radios: 0, agreements: 0 });

    const pptx = new PptxGenJS();
    pptx.defineSlideMaster({
      title: 'MASTER',
      background: { color: 'FFFFFF' },
      objects: [],
    });
    pptx.author = 'YDCS Radio Home';
    pptx.company = 'Yemisrach Dimts Communication Services';
    pptx.subject = `Monthly Report - ${monthName} ${year}`;
    pptx.title = `YDCS Radio Home Monthly Report - ${monthName} ${year}`;

    const primaryColor = '2563EB';
    const accentColor = '1E40AF';

    const addFooter = (slide: any) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 7.1, w: 10, h: 0.3,
        fill: { color: primaryColor },
      });
      slide.addText(`YDCS Radio Home | ${monthName} ${year}`, {
        x: 0.3, y: 7.13, w: 5, h: 0.25,
        fontSize: 8, color: 'FFFFFF',
      });
      slide.addText('Confidential', {
        x: 7.5, y: 7.13, w: 2.2, h: 0.25,
        fontSize: 8, color: 'FFFFFF', align: 'right',
      });
    };

    const addHeader = (slide: any, title: string) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.8,
        fill: { color: primaryColor },
      });
      slide.addText(title, {
        x: 0.5, y: 0.1, w: 9, h: 0.6,
        fontSize: 22, color: 'FFFFFF', bold: true,
      });
    };

    // --- Slide 1: Title ---
    const titleSlide = pptx.addSlide();
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 7.5,
      fill: { color: primaryColor },
    });
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: 2.5, w: 9, h: 3,
      fill: { color: 'FFFFFF' },
      rectRadius: 0.2,
    });
    titleSlide.addText('YDCS Radio Home', {
      x: 0.5, y: 0.8, w: 9, h: 0.8,
      fontSize: 32, color: 'FFFFFF', bold: true, align: 'center',
    });
    titleSlide.addText('Monthly Report', {
      x: 0.5, y: 1.6, w: 9, h: 0.6,
      fontSize: 20, color: 'DBEAFE', align: 'center',
    });
    titleSlide.addText(`${monthName} ${year}`, {
      x: 0.5, y: 2.8, w: 9, h: 0.8,
      fontSize: 36, color: primaryColor, bold: true, align: 'center',
    });
    titleSlide.addText(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
      x: 0.5, y: 3.8, w: 9, h: 0.5,
      fontSize: 14, color: '6B7280', align: 'center',
    });
    titleSlide.addText('Yemisrach Dimts Communication Services', {
      x: 0.5, y: 6.5, w: 9, h: 0.5,
      fontSize: 12, color: 'DBEAFE', align: 'center',
    });

    // --- Slide 2: Summary ---
    const summarySlide = pptx.addSlide();
    addHeader(summarySlide, 'Executive Summary');
    addFooter(summarySlide);

    const stats = [
      { label: 'Groups', value: groups.length },
      { label: 'Male', value: totals.male },
      { label: 'Female', value: totals.female },
      { label: 'Total Members', value: totals.total },
      { label: 'Radios Given', value: totals.radios },
      { label: 'Agreements', value: totals.agreements },
      { label: 'Media Items', value: mediaItems.length },
    ];

    const cols = 4;
    const cardW = 2.1;
    const cardH = 1.3;
    const startX = 0.4;
    const startY = 1.2;
    const gap = 0.2;

    stats.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      summarySlide.addShape(pptx.ShapeType.rect, {
        x, y, w: cardW, h: cardH,
        fill: { color: 'F0F9FF' },
        line: { color: 'BFDBFE', width: 1 },
        rectRadius: 0.1,
      });
      summarySlide.addText(String(s.value), {
        x, y: y + 0.15, w: cardW, h: 0.6,
        fontSize: 28, color: primaryColor, bold: true, align: 'center',
      });
      summarySlide.addText(s.label, {
        x, y: y + 0.7, w: cardW, h: 0.4,
        fontSize: 11, color: '6B7280', align: 'center',
      });
    });

    // --- Slide 3: Numbers by Region ---
    if (groups.length > 0) {
      const regionMap = new Map<string, { count: number; male: number; female: number; total: number; radios: number; agreements: number }>();
      groups.forEach(g => {
        const r = g.regionName || 'Unknown';
        const d = regionMap.get(r) || { count: 0, male: 0, female: 0, total: 0, radios: 0, agreements: 0 };
        d.count++; d.male += g.maleMembers; d.female += g.femaleMembers;
        d.total += g.totalMembers; d.radios += g.radioGiven; d.agreements += g.agreementMade;
        regionMap.set(r, d);
      });
      const regionData = Array.from(regionMap.entries()).sort((a, b) => b[1].count - a[1].count);

      const regionSlide = pptx.addSlide();
      addHeader(regionSlide, 'Summary by Region');
      addFooter(regionSlide);

      const cellOpt = (text: string, opts: Record<string, unknown> = {}) => ({ text, options: opts });
      const regionRows: any[][] = [
        [
          cellOpt('Region', { fontSize: 10, bold: true, color: 'FFFFFF', fill: { color: primaryColor } }),
          cellOpt('Groups', { fontSize: 10, bold: true, color: 'FFFFFF', fill: { color: primaryColor }, align: 'center' as const }),
          cellOpt('Male', { fontSize: 10, bold: true, color: 'FFFFFF', fill: { color: primaryColor }, align: 'center' as const }),
          cellOpt('Female', { fontSize: 10, bold: true, color: 'FFFFFF', fill: { color: primaryColor }, align: 'center' as const }),
          cellOpt('Total', { fontSize: 10, bold: true, color: 'FFFFFF', fill: { color: primaryColor }, align: 'center' as const }),
          cellOpt('Radios', { fontSize: 10, bold: true, color: 'FFFFFF', fill: { color: primaryColor }, align: 'center' as const }),
          cellOpt('Agreements', { fontSize: 10, bold: true, color: 'FFFFFF', fill: { color: primaryColor }, align: 'center' as const }),
        ],
      ];

      regionData.forEach(([name, d], i) => {
        const bg = i % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
        regionRows.push([
          cellOpt(name, { fontSize: 9, color: '111827', fill: { color: bg }, bold: true }),
          cellOpt(String(d.count), { fontSize: 9, color: '374151', fill: { color: bg }, align: 'center' as const }),
          cellOpt(String(d.male), { fontSize: 9, color: '374151', fill: { color: bg }, align: 'center' as const }),
          cellOpt(String(d.female), { fontSize: 9, color: '374151', fill: { color: bg }, align: 'center' as const }),
          cellOpt(String(d.total), { fontSize: 9, color: '374151', fill: { color: bg }, align: 'center' as const }),
          cellOpt(String(d.radios), { fontSize: 9, color: '374151', fill: { color: bg }, align: 'center' as const }),
          cellOpt(String(d.agreements), { fontSize: 9, color: '374151', fill: { color: bg }, align: 'center' as const }),
        ]);
      });

      regionSlide.addTable(regionRows, {
        x: 0.5, y: 1.1, w: 9,
        colW: [2.2, 1.1, 1.1, 1.1, 1.1, 1.1, 1.3],
        border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
        rowH: [0.38, ...regionData.map(() => 0.3)],
      });
    }

    // --- Media Slides ---
    if (mediaItems.length > 0) {
      const mediaSlidesMap = new Map<string, typeof mediaItems>();
      for (const m of mediaItems) {
        const key = m.groupSerialNumber || 'Ungrouped Testimonies';
        const list = mediaSlidesMap.get(key) || [];
        list.push(m);
        mediaSlidesMap.set(key, list);
      }

      for (const [label, items] of mediaSlidesMap.entries()) {
        const photos = items.filter(m => m.type === 'photo');
        const videos = items.filter(m => m.type === 'youtube' || m.type === 'video');

        for (let i = 0; i < photos.length; i += 2) {
          const mediaSlide = pptx.addSlide();
          addHeader(mediaSlide, `Photos - ${label}`);
          addFooter(mediaSlide);

          let yPos = 1.1;
          for (const p of photos.slice(i, i + 2)) {
            if (yPos > 6.5) break;
            const urlPath = p.url.startsWith('http') ? new URL(p.url).pathname : p.url;
            const imgPath = path.join(process.cwd(), config.upload.dir, urlPath.replace('/uploads/', ''));
            if (fs.existsSync(imgPath)) {
              try {
                mediaSlide.addImage({
                  path: imgPath,
                  x: 0.3, y: yPos, w: 3.5, h: 2.5,
                });
              } catch { /* skip image if broken */ }
            }
            const textX = 4.1;
            let textY = yPos;
            if (p.title) {
              mediaSlide.addText(p.title, {
                x: textX, y: textY, w: 5.3, h: 0.35,
                fontSize: 13, bold: true, color: '111827',
              });
              textY += 0.4;
            }
            if (p.description) {
              mediaSlide.addText(p.description, {
                x: textX, y: textY, w: 5.3, h: 0.6,
                fontSize: 10, color: '6B7280',
                valign: 'top',
              });
            }
            if (p.dateTaken) {
              mediaSlide.addText(new Date(p.dateTaken).toLocaleDateString(), {
                x: textX, y: textY + 0.7, w: 5.3, h: 0.3,
                fontSize: 9, color: '9CA3AF',
              });
            }
            yPos += 2.7;
          }
        }

        for (let i = 0; i < videos.length; i += 3) {
          const mediaSlide = pptx.addSlide();
          addHeader(mediaSlide, `Videos - ${label}`);
          addFooter(mediaSlide);

          let yPos = 1.1;
          for (const v of videos.slice(i, i + 3)) {
            if (yPos > 6.5) break;
            mediaSlide.addShape(pptx.ShapeType.rect, {
              x: 0.3, y: yPos, w: 3.5, h: 0.9,
              fill: { color: 'FEF2F2' },
              line: { color: 'FECACA', width: 1 },
              rectRadius: 0.05,
            });
            mediaSlide.addText('▶ Video', {
              x: 0.5, y: yPos + 0.05, w: 3.1, h: 0.3,
              fontSize: 10, bold: true, color: 'DC2626',
            });
            mediaSlide.addText(v.title || v.url, {
              x: 0.5, y: yPos + 0.35, w: 3.1, h: 0.4,
              fontSize: 8, color: '6B7280',
            });

            const textX = 4.1;
            let textY = yPos;
            if (v.title) {
              mediaSlide.addText(v.title, {
                x: textX, y: textY, w: 5.3, h: 0.35,
                fontSize: 13, bold: true, color: '111827',
              });
              textY += 0.4;
            }
            if (v.description) {
              mediaSlide.addText(v.description, {
                x: textX, y: textY, w: 5.3, h: 0.6,
                fontSize: 10, color: '6B7280',
                valign: 'top',
              });
              textY += 0.6;
            }
            if (v.url) {
              mediaSlide.addText(v.url, {
                x: textX, y: textY, w: 5.3, h: 0.3,
                fontSize: 8, color: '2563EB',
              });
            }
            yPos += 1.2;
          }
        }
      }
    }

    const result = await pptx.write({ outputType: 'nodebuffer' });
    return Buffer.from(result as ArrayBuffer);
  }
}

export const pptService = new PptService();
