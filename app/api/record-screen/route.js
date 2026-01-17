import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

export async function POST(request) {
  let browser;
  try {
    const { changes, reportKey } = await request.json();

    if (!changes || !Array.isArray(changes)) {
      return new Response(JSON.stringify({ error: 'Changes array is required' }), { status: 400 });
    }

    const baseUrl = process.env.DEPLOYED_SITE_URL;
    const framesDir = path.join(process.cwd(), 'public', 'frames', reportKey || 'default');
    const videoDir = path.join(process.cwd(), 'public', 'recordings');

    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const fps = 30; // Frames per second
    let frameCount = 0;

    // Navigate to first page
    const firstUrl = `${baseUrl}${changes[0].page_url}`;
    await page.goto(firstUrl, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Navigate through changes with smooth scrolling
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const url = `${baseUrl}${change.page_url}`;
      const duration = (change.duration_seconds || 5) * 1000;
      const totalFrames = Math.floor((duration / 1000) * fps);
      const frameInterval = 1000 / fps;

      console.log(`Recording change ${i + 1}: ${change.title} (${totalFrames} frames)`);

      // Navigate if URL changed
      if (i > 0 && changes[i - 1].page_url !== change.page_url) {
        await page.goto(url, { waitUntil: 'networkidle2' });
      }

      // Smooth scroll to element
      if (change.selector) {
        try {
          await page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, change.selector);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for scroll
        } catch (err) {
          console.warn(`Selector ${change.selector} not found`);
        }
      }

      // Capture frames at fps rate
      const startTime = Date.now();
      for (let f = 0; f < totalFrames; f++) {
        const framePath = path.join(framesDir, `frame_${String(frameCount).padStart(6, '0')}.png`);
        await page.screenshot({ path: framePath });
        frameCount++;
        
        // Wait to maintain proper timing
        const elapsedTime = Date.now() - startTime;
        const expectedTime = (f + 1) * frameInterval;
        const waitTime = expectedTime - elapsedTime;
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    await browser.close();

    // Stitch frames into video using ffmpeg
    const outputFilename = `${reportKey || Date.now()}_raw.mp4`;
    const outputPath = path.join(videoDir, outputFilename);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(framesDir, 'frame_%06d.png'))
        .inputOptions(['-framerate', fps.toString()])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r', fps.toString(),
        ])
        .output(outputPath)
        .on('start', (cmd) => console.log('FFmpeg command:', cmd))
        .on('progress', (progress) => console.log('Processing:', progress.percent, '%'))
        .on('end', () => {
          console.log('Video generation complete');
          // Clean up frames
          fs.rmSync(framesDir, { recursive: true, force: true });
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoPath: `/recordings/${outputFilename}`,
        filepath: outputPath,
      }),
      { status: 200 }
    );
  } catch (error) {
    if (browser) await browser.close();
    console.error('Recording error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
