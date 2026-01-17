import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

// Get audio duration using ffprobe
function getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata.format.duration);
        });
    });
}

export async function POST(request) {
    try {
        const { audioPath, screenshots, reportKey } = await request.json();

        if (!audioPath || !screenshots || !Array.isArray(screenshots)) {
            return new Response(
                JSON.stringify({ error: 'audioPath and screenshots array are required' }),
                { status: 400 }
            );
        }

        const videoDir = path.join(process.cwd(), 'public', 'videos');
        if (!fs.existsSync(videoDir)) {
            fs.mkdirSync(videoDir, { recursive: true });
        }

        const outputFilename = `${reportKey || Date.now()}.mp4`;
        const outputPath = path.join(videoDir, outputFilename);

        const audioFilePath = path.join(process.cwd(), 'public', audioPath.replace(/^\//, ''));

        // Get actual audio duration
        const audioDuration = await getAudioDuration(audioFilePath);
        console.log(`Audio duration: ${audioDuration}s`);

        // Distribute audio duration across screenshots proportionally
        const totalRequestedDuration = screenshots.reduce((sum, s) => sum + (s.duration || 5), 0);
        const adjustedScreenshots = screenshots.map((s) => ({
            ...s,
            adjustedDuration: (s.duration / totalRequestedDuration) * audioDuration,
        }));

        console.log('Adjusted screenshot durations:', adjustedScreenshots.map(s => s.adjustedDuration));

        // Create ffmpeg concat file
        const concatContent = adjustedScreenshots
            .map((s) => {
                const filepath = path.join(process.cwd(), 'public', s.path.replace(/^\//, ''));
                return `file '${filepath}'\nduration ${s.adjustedDuration}`;
            })
            .join('\n');

        // Add last image again (ffmpeg concat requirement)
        const lastScreenshot = adjustedScreenshots[adjustedScreenshots.length - 1];
        const lastFilepath = path.join(process.cwd(), 'public', lastScreenshot.path.replace(/^\//, ''));
        const concatFile = path.join(videoDir, `${reportKey}_concat.txt`);
        await writeFile(concatFile, concatContent + `\nfile '${lastFilepath}'`);

        // Generate video with ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(concatFile)
                .inputOptions(['-f concat', '-safe 0'])
                .input(audioFilePath)
                .outputOptions([
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    '-c:a aac',
                    '-shortest',
                    '-r 30',
                ])
                .output(outputPath)
                .on('start', (cmd) => console.log('FFmpeg command:', cmd))
                .on('progress', (progress) => console.log('Processing:', progress.percent, '%'))
                .on('end', () => {
                    console.log('Video generation complete');
                    // Clean up concat file
                    fs.unlinkSync(concatFile);
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
                videoPath: `/videos/${outputFilename}`,
                filepath: outputPath,
                audioDuration,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Video generation error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
