import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { uploadScreenshot } from '@/lib/storage';

export async function POST(request) {
  let browser;
  try {
    const { changes, reportKey, liveUrl } = await request.json();

    if (!changes || !Array.isArray(changes)) {
      return new Response(JSON.stringify({ error: 'Changes array is required' }), { status: 400 });
    }

    // Use liveUrl from request, or fall back to env variable
    const baseUrl = liveUrl || process.env.DEPLOYED_SITE_URL;
    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots', reportKey || 'default');

    // Create directory if it doesn't exist
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const screenshots = [];

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const url = `${baseUrl}${change.page_url}`;

      console.log(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait a bit for any animations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to find and scroll to the element
      if (change.selector) {
        try {
          const element = await page.$(change.selector);
          if (element) {
            await element.scrollIntoView();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.warn(`Selector ${change.selector} not found, taking full page screenshot`);
        }
      }

      // Take screenshot
      const filename = `change_${i + 1}.png`;
      const filepath = path.join(screenshotsDir, filename);
      await page.screenshot({ path: filepath, fullPage: false });

      // Upload to Supabase Storage
      console.log(`☁️ Uploading screenshot ${filename} to Supabase...`);
      const screenshotUrl = await uploadScreenshot(filepath, reportKey || 'default', filename);

      // Clean up local file after successful upload
      if (screenshotUrl) {
        const { deleteLocalFile } = await import('@/lib/storage');
        deleteLocalFile(filepath);
      }

      screenshots.push({
        index: i,
        title: change.title,
        description: change.description || '',
        path: `/screenshots/${reportKey || 'default'}/${filename}`,
        screenshotUrl: screenshotUrl || `/screenshots/${reportKey || 'default'}/${filename}`, // Supabase URL or fallback
        filepath,
        duration: change.duration_seconds,
      });

      console.log(`✅ Screenshot saved: ${filename}${screenshotUrl ? ' (uploaded to Supabase)' : ''}`);
    }

    await browser.close();

    return new Response(
      JSON.stringify({
        success: true,
        screenshots,
      }),
      { status: 200 }
    );
  } catch (error) {
    if (browser) await browser.close();
    console.error('Screenshot error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
