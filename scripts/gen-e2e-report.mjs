/*
 * gen-e2e-report.mjs — Generate the Phase 2 Playwright E2E report as .docx.
 * Reads a JSON payload (report data) and writes a Word document.
 * Usage: node scripts/gen-e2e-report.mjs <data.json> <out.docx>
 */
import fs from 'node:fs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
} from 'docx';

const [, , dataPath, outPath] = process.argv;
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const H = (text, level) => new Paragraph({ text, heading: level, spacing: { before: 200, after: 100 } });
const P = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 80 } });
const bullet = (text) => new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 40 } });

function cell(text, { bold = false, header = false } = {}) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: bold || header, color: header ? 'FFFFFF' : '000000', size: 20 })] })],
    shading: header ? { fill: '1B3A6B' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function table(headers, rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h) => cell(h, { header: true })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, { bold: i === 0 })) })),
    ],
  });
}

const children = [];
children.push(new Paragraph({ children: [new TextRun({ text: data.title, bold: true, size: 40, color: '1B3A6B' })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }));
children.push(new Paragraph({ children: [new TextRun({ text: data.subtitle, italics: true, size: 22, color: '666666' })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }));

for (const section of data.sections) {
  children.push(H(section.heading, HeadingLevel.HEADING_1));
  for (const block of section.blocks) {
    if (block.type === 'p') children.push(P(block.text, block.opts));
    else if (block.type === 'bullets') block.items.forEach((i) => children.push(bullet(i)));
    else if (block.type === 'table') children.push(table(block.headers, block.rows));
    else if (block.type === 'space') children.push(new Paragraph({ text: '' }));
  }
}

const doc = new Document({
  creator: 'Global Wakili — Claude Code',
  title: data.title,
  sections: [{ properties: {}, children }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buf);
console.log('WROTE', outPath, `(${buf.length} bytes)`);
