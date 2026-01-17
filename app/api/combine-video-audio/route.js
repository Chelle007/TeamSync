import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { uploadVideo, deleteLocalFile } from '@/lib/storage';

// Get video duration using ffprobe
function getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata.format.duration);
        });
    });
}

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
        const { videoPath, audioPath, reportKey } = await request.json();

        if (!videoPath || !audioPath) {
            return new Response(
                JSON.stringify({ error: 'videoPath and audioPath are required' }),
                { status: 400 }
            );
        }

        const videoDir = path.join(process.cwd(), 'public', 'final-videos');
        if (!fs.existsSync(videoDir)) {
            fs.mkdirSync(videoDir, { recursive: true });
        }

        const videoFilePath = path.join(process.cwd(), 'public', videoPath.replace(/^\//, ''));
        const audioFilePath = path.join(process.cwd(), 'public', audioPath.replace(/^\//, ''));

        // Get durations
        const videoDuration = await getVideoDuration(videoFilePath);
        const audioDuration = await getAudioDuration(audioFilePath);

        console.log(`Video duration: ${videoDuration}s`);
        console.log(`Audio duration: ${audioDuration}s`);

        const outputFilename = `${reportKey || Date.now()}_final.mp4`;
        const outputPath = path.join(videoDir, outputFilename);

        // Combine video and audio
        await new Promise((resolve, reject) => {
            let ffmpegCommand = ffmpeg();

            // If video is longer than audio, trim video to match audio
            if (videoDuration > audioDuration) {
                ffmpegCommand
                    .input(videoFilePath)
                    .input(audioFilePath)
                    .outputOptions(['-t', audioDuration.toString()])
                    .outputOptions([
                        '-c:v libx264', // Re-encode video to trim properly
                        '-c:a aac',     // Encode audio as AAC
                        '-map 0:v:0',   // Use video from first input
                        '-map 1:a:0',   // Use audio from second input
                    ]);
                console.log(`Trimming video to ${audioDuration}s to match audio`);
            }
            // If audio is longer than video, slow down video to match audio duration
            else if (audioDuration > videoDuration) {
                const speedFactor = videoDuration / audioDuration; // e.g., 15/17 = 0.88 (slower)
                console.log(`Slowing down video by factor ${speedFactor.toFixed(3)} to match audio duration (${videoDuration}s -> ${audioDuration}s)`);
                
                ffmpegCommand
                    .input(videoFilePath)
                    .input(audioFilePath)
                    .outputOptions([
                        '-filter_complex', `[0:v]setpts=PTS/${speedFactor}[v]`,
                        '-map', '[v]',
                        '-map', '1:a',
                        '-c:v', 'libx264',
                        '-c:a', 'aac',
                        '-t', audioDuration.toString()
                    ]);
            }
            // If durations match, just combine normally
            else {
                ffmpegCommand
                    .input(videoFilePath)
                    .input(audioFilePath)
                    .outputOptions([
                        '-c:v copy', // Copy video stream (no re-encoding)
                        '-c:a aac',  // Encode audio as AAC
                        '-map 0:v:0', // Use video from first input
                        '-map 1:a:0', // Use audio from second input
                    ]);
                console.log('Video and audio durations match, combining normally');
            }

            ffmpegCommand
                .output(outputPath)
                .on('start', (cmd) => console.log('FFmpeg command:', cmd))
                .on('progress', (progress) => console.log('Processing:', progress.percent, '%'))
                .on('end', () => {
                    console.log('Video+Audio combination complete');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .run();
        });

        // Upload to Supabase Storage
        console.log('☁️ Uploading video to Supabase...');
        const videoUrl = await uploadVideo(outputPath, reportKey || Date.now().toString());

        if (videoUrl) {
            console.log('✅ Video uploaded to Supabase:', videoUrl);
            // Clean up local files after successful upload
            deleteLocalFile(outputPath);
            deleteLocalFile(videoFilePath); // Raw video
            deleteLocalFile(audioFilePath); // Audio file (if still exists)
        } else {
            console.warn('⚠️ Supabase upload failed, keeping local files');
        }

        return new Response(
            JSON.stringify({
                success: true,
                finalVideoPath: `/final-videos/${outputFilename}`,
                videoUrl: videoUrl || `/final-videos/${outputFilename}`, // Supabase URL or fallback
                filepath: outputPath,
                videoDuration,
                audioDuration,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Video+Audio combination error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}