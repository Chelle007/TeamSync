import fs from 'fs';
import path from 'path';

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
  try {
    const { reportKey, projectName, script, changes, screenshots } = await request.json();

    if (!reportKey) {
      return new Response(
        JSON.stringify({ error: 'reportKey is required' }),
        { status: 400 }
      );
    }

    console.log('📄 Starting HTML document generation for:', reportKey);

    // Create output directory if it doesn't exist
    const docsDir = path.join(process.cwd(), 'public', 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const htmlPath = path.join(docsDir, `${reportKey}.html`);
    const docUrl = `/docs/${reportKey}.html`;

    // Date formatting
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Find screenshots or use changes
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

    // Build changes HTML
    let changesHtml = '';
    const numChanges = screenshotFiles.length || changes?.length || 0;
    
    for (let i = 0; i < numChanges; i++) {
      const screenshot = screenshotFiles[i];
      const change = changes?.[i];
      const title = screenshot?.title || change?.title || `Change ${i + 1}`;
      const description = screenshot?.description || change?.description || '';
      const imgPath = screenshot?.path || '';

      changesHtml += `
        <div class="change-card">
          <h3>${i + 1}. ${escapeHtml(title)}</h3>
          ${imgPath ? `
            <div class="screenshot-container">
              <img src="${imgPath}" alt="${escapeHtml(title)}" class="screenshot" />
            </div>
          ` : ''}
          ${description ? `<p class="caption">${escapeHtml(description)}</p>` : ''}
        </div>
      `;
    }

    // Generate HTML document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectName || 'Project')} Update - ${reportKey}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    
    .header .project-name {
      font-size: 18px;
      opacity: 0.9;
      margin-bottom: 4px;
    }
    
    .header .date {
      font-size: 14px;
      opacity: 0.7;
    }
    
    .content {
      padding: 40px;
    }
    
    .summary-section {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      border-left: 4px solid #667eea;
    }
    
    .summary-section h2 {
      font-size: 18px;
      color: #1a1a2e;
      margin-bottom: 12px;
    }
    
    .summary-section p {
      color: #4a5568;
      line-height: 1.7;
    }
    
    .changes-section h2 {
      font-size: 20px;
      color: #1a1a2e;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .change-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      transition: box-shadow 0.2s;
    }
    
    .change-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .change-card h3 {
      font-size: 16px;
      color: #2d3748;
      margin-bottom: 16px;
    }
    
    .screenshot-container {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    
    .screenshot {
      width: 100%;
      height: auto;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .caption {
      font-size: 14px;
      color: #64748b;
      font-style: italic;
      text-align: center;
      margin-top: 8px;
    }
    
    .footer {
      text-align: center;
      padding: 24px;
      background: #f8fafc;
      color: #94a3b8;
      font-size: 12px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
      .change-card {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Project Update Report</h1>
      <div class="project-name">${escapeHtml(projectName || 'Project')}</div>
      <div class="date">${dateStr}</div>
    </div>
    
    <div class="content">
      ${script ? `
        <div class="summary-section">
          <h2>📝 Summary</h2>
          <p>${escapeHtml(script)}</p>
        </div>
      ` : ''}
      
      <div class="changes-section">
        <h2>🔄 Changes</h2>
        ${changesHtml || '<p style="color: #94a3b8;">No changes recorded.</p>'}
      </div>
    </div>
    
    <div class="footer">
      Generated by TeamSync • ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;

    // Write HTML file
    fs.writeFileSync(htmlPath, html);

    console.log('✅ HTML document generated:', docUrl);

    return new Response(
      JSON.stringify({
        success: true,
        documentUrl: docUrl,
        documentPath: htmlPath,
        title: `${projectName || 'Project'} Update - ${reportKey}`,
      }),
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Document generation failed:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate document',
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
