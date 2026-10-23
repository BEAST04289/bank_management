const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { marked } = require('marked');

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false
});

const mdPath = path.join(__dirname, 'Bank_Management_System_Project_Report.md');
const htmlPath = path.join(__dirname, 'Bank_Management_System_Project_Report.html');
const pdfPath = path.join(__dirname, 'Bank_Management_System_Project_Report.pdf');

const mdContent = fs.readFileSync(mdPath, 'utf8');
const bodyHtml = marked.parse(mdContent);

// Convert erd.png to base64 so it embeds reliably even if edge sandbox has local file access restrictions
let erdBase64 = '';
const erdPath = path.join(__dirname, 'erd.png');
if (fs.existsSync(erdPath)) {
  const erdBuffer = fs.readFileSync(erdPath);
  erdBase64 = `data:image/png;base64,${erdBuffer.toString('base64')}`;
}

// Replace erd.png with base64 data URI in bodyHtml
const processedBody = bodyHtml.replace(/src=["']erd\.png["']/g, `src="${erdBase64}"`);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bank Management System - Project Report</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 16mm;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      table, pre, blockquote, figure, img {
        page-break-inside: avoid !important;
      }
      h1, h2, h3, h4 {
        page-break-after: avoid !important;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    h1 {
      font-size: 19pt;
      color: #0f172a;
      margin-top: 22pt;
      margin-bottom: 10pt;
      border-bottom: 1.5pt solid #cbd5e1;
      padding-bottom: 5pt;
    }

    h2 {
      font-size: 14pt;
      color: #1e293b;
      margin-top: 18pt;
      margin-bottom: 9pt;
      border-bottom: 1pt solid #e2e8f0;
      padding-bottom: 4pt;
    }

    h3 {
      font-size: 12pt;
      color: #334155;
      margin-top: 15pt;
      margin-bottom: 7pt;
    }

    h4 {
      font-size: 10.5pt;
      color: #475569;
      margin-top: 12pt;
      margin-bottom: 5pt;
    }

    p {
      margin-top: 0;
      margin-bottom: 8pt;
      text-align: justify;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 10pt;
      padding-left: 20pt;
    }

    li {
      margin-bottom: 4pt;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0 16pt 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 5.5pt 7.5pt;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 9pt;
      background-color: #f1f5f9;
      padding: 1pt 3pt;
      border-radius: 3pt;
      color: #0f172a;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    pre {
      font-family: Consolas, "Courier New", monospace;
      font-size: 8pt;
      line-height: 1.4;
      background-color: #0f172a;
      color: #e2e8f0;
      padding: 9pt 11pt;
      border-radius: 5pt;
      margin: 9pt 0 13pt 0;
      page-break-inside: avoid;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    pre code {
      background: none;
      color: inherit;
      padding: 0;
      font-size: inherit;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    hr {
      border: none;
      border-top: 1pt solid #cbd5e1;
      margin: 18pt 0;
    }

    u {
      text-decoration: underline;
      font-weight: 600;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 14pt auto;
    }
  </style>
</head>
<body>
${processedBody}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('✅ HTML generated successfully at:', htmlPath);

// Execute headless Edge to generate PDF
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const args = [
  '--headless',
  '--disable-gpu',
  '--run-all-compositor-stages-before-draw',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  htmlPath
];

console.log('Generating PDF via headless Edge with --no-pdf-header-footer...');
const result = spawnSync(edgePath, args, { stdio: 'inherit' });

if (result.status === 0) {
  console.log('✅ PDF generated successfully at:', pdfPath);
} else {
  console.error('❌ Failed to generate PDF, exit code:', result.status);
}
