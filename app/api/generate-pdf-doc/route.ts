import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { uploadPdf, deleteLocalFile } from '@/lib/storage';

interface Change {
  title: string;
  description: string;
  page_url?: string;
}

interface Screenshot {
  index: number;
  title: string;
  description?: string;
  path: string;
  filepath: string;
}

export async function POST(request: Request) {
  let browser;
  try {
    const { reportKey, projectName, script, changes, screenshots } = await request.json();

    if (!reportKey) {
      return new Response(
        JSON.stringify({ error: 'reportKey is required' }),
        { status: 400 }
      );
    }

    console.log('📄 Starting PDF generation for:', reportKey);

    // Create output directory if it doesn't exist
    const docsDir = path.join(process.cwd(), 'public', 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const pdfPath = path.join(docsDir, `${reportKey}.pdf`);
    const docUrl = `/docs/${reportKey}.pdf`;

    // Date formatting
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Find screenshots
    let screenshotFiles: Screenshot[] = screenshots || [];

    if (screenshotFiles.length === 0 && changes) {
      const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots', reportKey);
      if (fs.existsSync(screenshotsDir)) {
        const files = fs.readdirSync(screenshotsDir).filter((f: string) => f.endsWith('.png'));
        screenshotFiles = files.map((file: string, index: number) => ({
          index,
          title: changes[index]?.title || `Change ${index + 1}`,
          description: changes[index]?.description || '',
          filepath: path.join(screenshotsDir, file),
          path: `/screenshots/${reportKey}/${file}`,
        }));
      }
    }

    // Build changes HTML with embedded images
    let changesHtml = '';
    const numChanges = screenshotFiles.length || changes?.length || 0;
    
    for (let i = 0; i < numChanges; i++) {
      const screenshot = screenshotFiles[i];
      const change = changes?.[i];
      const title = screenshot?.title || change?.title || `Change ${i + 1}`;
      const description = screenshot?.description || change?.description || '';
      
      // Convert image to base64 for embedding in PDF
      let imgBase64 = '';
      const imgFilePath = screenshot?.filepath || (screenshot?.path ? path.join(process.cwd(), 'public', screenshot.path) : '');
      if (imgFilePath && fs.existsSync(imgFilePath)) {
        const imgBuffer = fs.readFileSync(imgFilePath);
        imgBase64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
      }

      changesHtml += `
        <div class="change-section">
          <h3>${i + 1}. ${escapeHtml(title)}</h3>
          ${imgBase64 ? `
            <div class="screenshot-box">
              <img src="${imgBase64}" alt="${escapeHtml(title)}" />
            </div>
          ` : ''}
          ${description ? `<p class="caption">${escapeHtml(description)}</p>` : ''}
        </div>
      `;
    }

    // Generate formal PDF HTML template
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(projectName || 'Project')} Update Report</title>
  <style>
    @page {
      margin: 60px 50px;
      size: A4;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .header .subtitle {
      font-size: 14pt;
      color: #444;
      margin-bottom: 5px;
    }
    
    .header .date {
      font-size: 11pt;
      color: #666;
      font-style: italic;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    
    .summary-text {
      text-align: justify;
      font-size: 12pt;
      line-height: 1.8;
      color: #333;
    }
    
    .change-section {
      margin-bottom: 35px;
      page-break-inside: avoid;
    }
    
    .change-section h3 {
      font-size: 13pt;
      font-weight: bold;
      margin-bottom: 15px;
      color: #1a1a1a;
    }
    
    .screenshot-box {
      border: 1px solid #ddd;
      padding: 10px;
      background: #fafafa;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .screenshot-box img {
      max-width: 100%;
      height: auto;
      max-height: 350px;
      object-fit: contain;
    }
    
    .caption {
      font-size: 11pt;
      font-style: italic;
      color: #555;
      text-align: center;
      margin-top: 8px;
    }
    
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9pt;
      color: #999;
      padding: 10px 0;
      border-top: 1px solid #eee;
    }
    
    .divider {
      border: none;
      border-top: 1px solid #ddd;
      margin: 25px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Project Update Report</h1>
    <div class="subtitle">${escapeHtml(projectName || 'Project')}</div>
    <div class="date">${dateStr}</div>
  </div>
  
  ${script ? `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <p class="summary-text">${escapeHtml(script)}</p>
    </div>
    <hr class="divider" />
  ` : ''}
  
  <div class="section">
    <div class="section-title">Changes Overview</div>
    ${changesHtml || '<p>No changes recorded in this update.</p>'}
  </div>
  
  <div class="footer">
    Generated by TeamSync &bull; ${new Date().toISOString().split('T')[0]}
  </div>
</body>
</html>`;

    // Launch Puppeteer and generate PDF
    console.log('🖨️ Rendering PDF with Puppeteer...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '60px',
        bottom: '60px',
        left: '50px',
        right: '50px',
      },
    });

    await browser.close();
    browser = null;

    console.log('✅ PDF generated locally:', pdfPath);

    // Upload to Supabase Storage
    console.log('☁️ Uploading PDF to Supabase...');
    const pdfUrl = await uploadPdf(pdfPath, reportKey);

    if (pdfUrl) {
      console.log('✅ PDF uploaded to Supabase:', pdfUrl);
      // Clean up local files after successful upload
      deleteLocalFile(pdfPath);
      
      // Also clean up screenshots folder
      const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots', reportKey);
      if (fs.existsSync(screenshotsDir)) {
        fs.rmSync(screenshotsDir, { recursive: true, force: true });
        console.log('🗑️ Deleted screenshots directory:', screenshotsDir);
      }
    } else {
      console.warn('⚠️ Supabase upload failed, keeping local file');
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentUrl: pdfUrl || docUrl, // Supabase URL or fallback to local
        documentPath: pdfPath,
        title: `${projectName || 'Project'} Update Report - ${reportKey}`,
      }),
      { status: 200 }
    );

  } catch (error: any) {
    if (browser) await browser.close();
    console.error('❌ PDF generation failed:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate PDF',
        details: error.toString(),
      }),
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
