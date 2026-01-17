import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_SECRET_KEY,
});

export async function POST(request) {
  try {
    const { script, reportKey } = await request.json();

    if (!script) {
      return new Response(JSON.stringify({ error: 'Script is required' }), { status: 400 });
    }

    // Generate TTS audio
    const mp3 = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: script,
    });

    // Save audio file locally
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const filename = `${reportKey || Date.now()}.mp3`;
    const filepath = path.join(audioDir, filename);
    fs.writeFileSync(filepath, buffer);

    return new Response(
      JSON.stringify({
        success: true,
        audioPath: `/audio/${filename}`,
        filepath,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('TTS error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
