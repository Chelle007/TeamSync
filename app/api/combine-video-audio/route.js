import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

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
            const ffmpegCommand = ffmpeg()
                .input(videoFilePath)
                .input(audioFilePath);

            // If video is longer than audio, trim video to match audio
            if (videoDuration > audioDuration) {
                ffmpegCommand.outputOptions(['-t', audioDuration.toString()]);
                console.log(`Trimming video to ${audioDuration}s to match audio`);
            }
            // If audio is longer than video, trim audio to match video
            else if (audioDuration > videoDuration) {
                ffmpegCommand.inputOptions(['-t', videoDuration.toString()]);
                console.log(`Trimming audio to ${videoDuration}s to match video`);
            }

            ffmpegCommand
                .outputOptions([
                    '-c:v copy', // Copy video stream (no re-encoding)
                    '-c:a aac',  // Encode audio as AAC
                    '-map 0:v:0', // Use video from first input
                    '-map 1:a:0', // Use audio from second input
                ])
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

        return new Response(
            JSON.stringify({
                success: true,
                finalVideoPath: `/final-videos/${outputFilename}`,
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