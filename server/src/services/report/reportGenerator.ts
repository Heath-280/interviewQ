import PDFDocument from 'pdfkit';
import type { IInterviewDocument } from '../../models/Interview';
import type { IUserDocument } from '../../models/User';

const COLORS = {
  primary: '#4f46e5',
  ink: '#111827',
  muted: '#6b7280',
  line: '#e5e7eb',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  soft: '#f3f4f6',
};

function scoreColor(score: number): string {
  if (score >= 75) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
}

function truncate(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

export function generateInterviewReport(
  interview: IInterviewDocument,
  user: IUserDocument,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const contentWidth = right - left;

      const ensureSpace = (needed: number) => {
        if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }
      };

      const sectionTitle = (title: string) => {
        ensureSpace(40);
        doc.moveDown(0.8);
        doc.fontSize(13).fillColor(COLORS.primary).font('Helvetica-Bold').text(title.toUpperCase());
        const y = doc.y + 3;
        doc.moveTo(left, y).lineTo(right, y).strokeColor(COLORS.line).lineWidth(1).stroke();
        doc.moveDown(0.6);
        doc.fillColor(COLORS.ink);
      };

      const bullet = (text: string, color = COLORS.ink) => {
        ensureSpace(24);
        doc.fontSize(10).fillColor(color).font('Helvetica');
        doc.text(`•  ${text}`, { indent: 4 });
        doc.moveDown(0.15);
      };

      const labeledBullets = (items: string[], fallback: string, color = COLORS.ink) => {
        if (!items || items.length === 0) {
          bullet(fallback, COLORS.muted);
          return;
        }
        items.forEach((item) => bullet(item, color));
      };

      /* ----------------------------- Header ----------------------------- */
      doc.rect(0, 0, doc.page.width, 96).fill(COLORS.primary);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('InterviewIQ', left, 28);
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#e0e7ff')
        .text('Interview Performance Report', left, 58);
      doc.fillColor(COLORS.ink);
      doc.x = left;
      doc.y = 120;

      /* ------------------------------ Meta ------------------------------ */
      const metaRows: [string, string][] = [
        ['Candidate', user.name],
        ['Email', user.email],
        ['Target role', interview.role],
        ['Company', interview.company || 'Not specified'],
        ['Interview type', `${interview.type} · ${interview.difficulty}`],
        ['Status', interview.status],
        [
          'Date',
          (interview.completedAt ?? interview.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        ],
        ['Duration', formatDuration(interview.durationSeconds)],
      ];
      doc.fontSize(10).font('Helvetica');
      metaRows.forEach(([label, value]) => {
        const y = doc.y;
        doc.fillColor(COLORS.muted).text(label, left, y, { width: contentWidth * 0.35 });
        doc.fillColor(COLORS.ink).font('Helvetica-Bold').text(value, left + contentWidth * 0.35, y);
        doc.font('Helvetica');
        doc.moveDown(0.25);
      });

      /* --------------------------- Overall score ------------------------ */
      sectionTitle('Overall result');
      const boxY = doc.y;
      doc.roundedRect(left, boxY, contentWidth, 64, 8).fillAndStroke(COLORS.soft, COLORS.line);
      doc
        .fillColor(scoreColor(interview.overallScore))
        .font('Helvetica-Bold')
        .fontSize(30)
        .text(`${interview.overallScore}`, left + 20, boxY + 14, { width: 90, align: 'center' });
      doc
        .fillColor(COLORS.muted)
        .font('Helvetica')
        .fontSize(9)
        .text('/ 100 overall', left + 20, boxY + 48, { width: 90, align: 'center' });

      const skills: [string, number][] = [
        ['Technical', interview.skillScores.technical],
        ['Communication', interview.skillScores.communication],
        ['Problem solving', interview.skillScores.problemSolving],
        ['Confidence', interview.skillScores.confidence],
      ];
      const barStartX = left + 130;
      const barWidth = right - barStartX - 20;
      skills.forEach(([label, value], index) => {
        const y = boxY + 12 + index * 13;
        doc.fillColor(COLORS.ink).fontSize(9).font('Helvetica-Bold').text(label, barStartX, y, {
          width: 95,
        });
        doc.roundedRect(barStartX + 100, y + 1, barWidth - 130, 7, 3.5).fill(COLORS.line);
        doc
          .roundedRect(barStartX + 100, y + 1, Math.max(4, ((barWidth - 130) * value) / 100), 7, 3.5)
          .fill(scoreColor(value));
        doc
          .fillColor(COLORS.muted)
          .font('Helvetica')
          .text(`${value}`, barStartX + barWidth - 24, y, { width: 24, align: 'right' });
      });
      doc.y = boxY + 78;

      /* ----------------------------- Summary ---------------------------- */
      if (interview.summary) {
        sectionTitle('Executive summary');
        doc.fontSize(10).fillColor(COLORS.ink).font('Helvetica').text(interview.summary, {
          align: 'justify',
        });
      }

      /* -------------------- Strengths / weaknesses ---------------------- */
      sectionTitle('Strengths');
      labeledBullets(interview.strengths, 'No strengths recorded.', COLORS.success);
      sectionTitle('Areas to improve');
      labeledBullets(interview.weaknesses, 'No weaknesses recorded.', COLORS.warning);
      sectionTitle('Recommended next steps');
      labeledBullets(interview.recommendations, 'No recommendations recorded.');

      /* ----------------------- Question breakdown ------------------------ */
      sectionTitle('Question-by-question breakdown');
      interview.questions.forEach((q, index) => {
        const score = q.feedback?.score ?? 0;
        ensureSpace(140);
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink);
        doc.text(`Q${index + 1}  ·  ${q.category}`, { continued: false });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text(truncate(q.question, 400));
        doc.moveDown(0.2);
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(scoreColor(score))
          .text(`Score: ${score}/100`)
          .moveDown(0.2);
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('Answer:');
        doc.fillColor(COLORS.ink).text(truncate(q.userAnswer || '(not answered)', 600));
        if (q.feedback?.summary) {
          doc.moveDown(0.2);
          doc.fillColor(COLORS.muted).text('Feedback:');
          doc.fillColor(COLORS.ink).text(truncate(q.feedback.summary, 600), { align: 'justify' });
        }
        if (q.feedback?.suggestedAnswer) {
          doc.moveDown(0.2);
          doc.fillColor(COLORS.muted).text('Suggested answer:');
          doc.fillColor(COLORS.ink).text(truncate(q.feedback.suggestedAnswer, 700), {
            align: 'justify',
          });
        }
        if (q.followUps.length) {
          doc.moveDown(0.2);
          doc.fillColor(COLORS.muted).text(`Follow-ups: ${q.followUps.length}`);
        }
        const y = doc.y + 4;
        doc.moveTo(left, y).lineTo(right, y).strokeColor(COLORS.line).stroke();
        doc.moveDown(0.4);
      });

      /* ---------------------------- Footer ------------------------------ */
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const footerY = doc.page.height - 40;
        doc
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text(
            `InterviewIQ report · Generated ${new Date().toLocaleString()} · Page ${i + 1} of ${range.count}`,
            left,
            footerY,
            { width: contentWidth, align: 'center' },
          );
      }

      if (interview.generationSource === 'dev-template') {
        doc
          .fontSize(8)
          .fillColor(COLORS.warning)
          .text(
            'Note: feedback in this report was generated by development templates because no AI provider is configured.',
            left,
            doc.page.height - 52,
            { width: contentWidth, align: 'center' },
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
