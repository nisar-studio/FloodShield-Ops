const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('C:/Users/Asus/AppData/Local/Temp/agent-tmp/node_modules/pdfkit/js/pdfkit.js');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'docs', 'FloodShield-Ops-Operator-Guide.md');
const outputPath = path.join(root, 'docs', 'FloodShield-Ops-Operator-Guide.pdf');
const markdown = fs.readFileSync(sourcePath, 'utf8');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 48, bottom: 48, left: 54, right: 54 },
  info: {
    Title: 'FloodShield Ops — Operator, Presentation, and Viva Guide',
    Author: 'FloodShield Ops Team',
    Subject: 'Simple explanation of the FloodShield Ops flood-response dashboard',
  },
});

const output = fs.createWriteStream(outputPath);
doc.pipe(output);

const colors = {
  ink: '#17232D',
  muted: '#536773',
  teal: '#167B80',
  blue: '#2F6D8A',
  amber: '#B56D1B',
  red: '#B4433C',
  pale: '#EEF5F5',
  line: '#D5E0E2',
};

function ensureSpace(height = 40) {
  if (doc.y + height > 760) doc.addPage();
}

function text(value, options = {}) {
  doc.font('Helvetica').fontSize(options.size || 10).fillColor(options.color || colors.ink);
  doc.text(value, {
    width: options.width || 487,
    align: options.align || 'left',
    lineGap: options.lineGap === undefined ? 2 : options.lineGap,
    continued: options.continued || false,
  });
}

function paragraph(value) {
  ensureSpace(45);
  text(value, { size: 10, color: colors.ink, lineGap: 3 });
  doc.moveDown(0.45);
}

function heading(value, level) {
  const size = level === 1 ? 23 : level === 2 ? 16 : 12;
  ensureSpace(level === 1 ? 70 : 48);
  doc.moveDown(level === 1 ? 0.2 : 0.55);
  doc.font('Helvetica-Bold').fontSize(size).fillColor(level === 1 ? colors.teal : colors.ink);
  doc.text(value, { width: 487, lineGap: 2 });
  if (level === 1) {
    doc.moveDown(0.15);
    doc.strokeColor(colors.teal).lineWidth(2).moveTo(54, doc.y).lineTo(541, doc.y).stroke();
  }
  doc.moveDown(0.25);
}

function bullet(value, ordered) {
  ensureSpace(24);
  const marker = ordered ? `${ordered}.` : '•';
  const cleanValue = value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1');
  doc.font('Helvetica').fontSize(10).fillColor(colors.ink).text(`${marker} ${cleanValue}`, 58, doc.y, {
    width: 483,
    lineGap: 2,
  });
  doc.moveDown(0.15);
}

function codeBlock(lines) {
  const value = lines.join('\n');
  const height = Math.max(34, value.split('\n').length * 13 + 18);
  ensureSpace(height + 14);
  const y = doc.y;
  doc.roundedRect(54, y, 487, height, 5).fillAndStroke(colors.pale, colors.line);
  doc.font('Courier').fontSize(8.5).fillColor(colors.ink).text(value, 66, y + 9, {
    width: 463,
    lineGap: 2,
  });
  doc.y = y + height + 10;
}

function quoteBlock(value) {
  const quoteHeight = doc.heightOfString(value, { width: 445, lineGap: 3 }) + 20;
  ensureSpace(quoteHeight + 10);
  const y = doc.y;
  doc.roundedRect(60, y, 477, quoteHeight, 5).fill(colors.pale);
  doc.rect(60, y, 4, quoteHeight).fill(colors.teal);
  doc.font('Helvetica-Oblique').fontSize(10).fillColor(colors.ink).text(value, 76, y + 10, {
    width: 445,
    lineGap: 3,
  });
  doc.y = y + quoteHeight + 10;
}

function tableRow(cells, header = false) {
  ensureSpace(24);
  const widths = [130, 357];
  const startY = doc.y;
  const heights = cells.map((cell, i) => {
    const measure = doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).heightOfString(cell, { width: widths[i] - 12, lineGap: 1 });
    return measure;
  });
  const rowHeight = Math.max(22, ...heights) + 10;
  let x = 54;
  cells.forEach((cell, i) => {
    doc.rect(x, startY, widths[i], rowHeight).fillAndStroke(header ? colors.teal : '#FFFFFF', colors.line);
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(header ? '#FFFFFF' : colors.ink).text(cell, x + 6, startY + 5, {
      width: widths[i] - 12,
      lineGap: 1,
    });
    x += widths[i];
  });
  doc.y = startY + rowHeight;
}

const lines = markdown.replace(/\r/g, '').split('\n');
let inCode = false;
let codeLines = [];
let listNumber = 0;
let inTable = false;

for (const rawLine of lines) {
  const line = rawLine.trimEnd();

  if (line.startsWith('```')) {
    if (inCode) {
      codeBlock(codeLines);
      inCode = false;
      codeLines = [];
    } else {
      inCode = true;
    }
    continue;
  }

  if (inCode) {
    codeLines.push(line);
    continue;
  }

  if (!line.trim()) {
    doc.moveDown(0.15);
    continue;
  }

  if (line.startsWith('|')) {
    if (/^\|\s*-+/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    tableRow(cells, !inTable);
    inTable = true;
    continue;
  }
  inTable = false;

  if (line.startsWith('# ')) {
    heading(line.slice(2), 1);
    continue;
  }
  if (line.startsWith('## ')) {
    heading(line.slice(3), 2);
    continue;
  }
  if (line.startsWith('### ')) {
    heading(line.slice(4), 3);
    continue;
  }
  if (line.startsWith('#### ')) {
    heading(line.slice(5), 3);
    continue;
  }
  if (line === '---') {
    ensureSpace(14);
    doc.strokeColor(colors.line).lineWidth(0.8).moveTo(54, doc.y).lineTo(541, doc.y).stroke();
    doc.moveDown(0.35);
    continue;
  }
  if (line.startsWith('> ')) {
    quoteBlock(line.slice(2));
    continue;
  }
  if (/^\d+\.\s/.test(line)) {
    const match = line.match(/^(\d+)\.\s+(.*)$/);
    listNumber = Number(match[1]);
    bullet(match[2], listNumber);
    continue;
  }
  if (line.startsWith('- ')) {
    bullet(line.slice(2), null);
    continue;
  }

  const clean = line
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1');
  paragraph(clean);
}

if (inCode && codeLines.length) codeBlock(codeLines);
doc.end();

output.on('finish', () => {
  console.log(`Created ${outputPath}`);
});
