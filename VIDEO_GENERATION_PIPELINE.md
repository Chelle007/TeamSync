# 🎬 Video Generation Pipeline Documentation

## Overview

This system automatically generates narrated screen recording videos from code changes. Think of it as an AI-powered "demo video generator" that takes your project updates and creates professional presentation videos.

## 🎯 What Does It Do?

**Input:** Project changes (commits, documents, etc.)  
**Output:** A polished video showing the changes with AI-generated narration

**Example:** You update a website's footer color and font. The system creates a video that:
1. Shows the website before changes
2. Scrolls to highlight the footer color change
3. Shows the font change across the site
4. Narrates: "In this update, Desmond changed the footer color to neon green and updated the font to Montserrat for better readability"

## 🔄 The 4-Step Pipeline

### Step 1: 📝 AI Content Generation
**What:** Analyzes your changes and creates a script + visual plan  
**Input:** Project commits, documents, change descriptions  
**Output:** 
- Narration script (what the AI voice will say)
- List of visual changes to show
- Timing for each section

```json
{
  "script": "In this update, Desmond made two changes...",
  "changes": [
    {
      "title": "Changed Footer Color",
      "description": "Updated footer from pink to neon green", 
      "page_url": "/",
      "selector": "footer",
      "duration_seconds": 6
    }
  ]
}
```

### Step 2: 🎵 Text-to-Speech (TTS)
**What:** Converts the script into spoken audio  
**Input:** The AI-generated script  
**Output:** MP3 audio file with natural-sounding narration  
**Technology:** OpenAI's TTS API with `alloy` voice

**Process:**
1. Takes the script text
2. Sends to OpenAI TTS API
3. Receives audio stream
4. Saves as MP3 file (e.g., `PR_5_2026_01_17.mp3`)

### Step 3: 📹 Screen Recording with Puppeteer
**What:** Creates a video showing the actual changes on your website  
**Input:** List of changes with page URLs and CSS selectors  
**Output:** MP4 video file showing the visual changes

**Process:**
1. **Launch Browser:** Starts headless Chrome via Puppeteer
2. **Navigate:** Goes to your website pages
3. **Smart Scrolling:** Automatically scrolls to highlight specific elements
4. **Frame Capture:** Takes screenshots at 24fps while scrolling/showing changes
5. **Video Assembly:** Uses FFmpeg to stitch screenshots into smooth MP4

**Technical Details:**
- Resolution: 1920x1080
- Frame Rate: 24fps
- Smooth scrolling between elements
- Configurable duration per change (from AI analysis)

### Step 4: 🎬 Video + Audio Combination
**What:** Merges the screen recording with the narration  
**Input:** MP4 video file + MP3 audio file  
**Output:** Final synchronized video

**Smart Duration Matching:**
- If audio is longer than video → Slows down video to match
- If video is longer than audio → Trims video to match
- Ensures perfect synchronization

## 🛠️ Technical Architecture

### File Structure
```
public/
├── audio/           # TTS-generated MP3 files
├── recordings/      # Raw screen recordings  
├── final-videos/    # Combined final videos
├── screenshots/     # Individual frames (temp)
└── frames/         # Frame sequences (temp)
```

### API Endpoints
```
POST /api/generate-full-video     # Main orchestrator
POST /api/generate-tts           # Text-to-speech
POST /api/record-screen          # Screen recording  
POST /api/combine-video-audio    # Video combination
POST /api/projects/summarize     # AI analysis (Phase 6)
```

### Dependencies
- **Puppeteer:** Browser automation for screen recording
- **FFmpeg:** Video processing and combination
- **OpenAI API:** Text-to-speech generation
- **Next.js:** API routes and web framework

## 🎮 How to Use

### Option 1: API Call
```bash
curl -X POST http://localhost:3000/api/generate-full-video \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PR_5",
    "commits": [...],
    "documents": [...]
  }'
```

### Option 2: Web Interface
1. Visit `http://localhost:3000/test-pipeline`
2. Click "Run Full Pipeline"
3. Watch progress and view result

### Option 3: Test Script
```bash
node scripts/test-full-pipeline.js
```

## 📊 Example Flow

Let's trace through a real example:

### Input Data
```json
{
  "projectId": "PR_5",
  "commits": [
    {
      "message": "Update footer color to neon green",
      "files": ["styles/footer.css"]
    },
    {
      "message": "Change font to Montserrat", 
      "files": ["styles/globals.css"]
    }
  ]
}
```

### Step 1: AI Analysis
```json
{
  "script": "In this update, Desmond made two visual changes to the event website. First, the footer color was changed from pink to neon green for a more vibrant look. Second, the entire website font was updated from Geist to Montserrat to improve readability and give the site a more modern feel.",
  "changes": [
    {
      "title": "Changed Footer Color",
      "page_url": "/",
      "selector": "footer", 
      "duration_seconds": 6
    },
    {
      "title": "Updated Website Font",
      "page_url": "/",
      "selector": "body",
      "duration_seconds": 7  
    }
  ]
}
```

### Step 2: TTS Generation
- **Input:** The script text
- **Output:** `public/audio/PR_5_2026_01_17.mp3` (17 seconds)
- **Voice:** Natural-sounding AI narration

### Step 3: Screen Recording
1. **Navigate to website:** `https://your-site.com/`
2. **Record footer change:** 
   - Scroll to footer element
   - Hold for 6 seconds showing the neon green color
3. **Record font change:**
   - Scroll to show body text
   - Hold for 7 seconds showing Montserrat font
4. **Output:** `public/recordings/PR_5_2026_01_17_raw.mp4` (15 seconds)

### Step 4: Video Combination
- **Video:** 15 seconds
- **Audio:** 17 seconds  
- **Solution:** Slow down video to 88% speed (15s → 17s)
- **Output:** `public/final-videos/PR_5_2026_01_17_final.mp4`

### Final Result
A 17-second video that:
- Shows your website changes visually
- Has professional AI narration explaining what changed
- Is perfectly synchronized
- Ready to share with stakeholders!

## 🔧 Configuration

### Environment Variables
```bash
# Required for TTS
OPENAI_API_KEY=your_openai_key

# Required for screen recording  
DEPLOYED_SITE_URL=https://your-website.com

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Customization Options

**TTS Voice:** Change in `app/api/generate-tts/route.js`
```javascript
voice: 'alloy' // Options: alloy, echo, fable, onyx, nova, shimmer
```

**Video Quality:** Modify in `app/api/record-screen/route.js`
```javascript
await page.setViewport({ width: 1920, height: 1080 });
const fps = 24; // Frames per second
```

**Duration per Change:** Controlled by AI analysis or manual override
```json
{
  "duration_seconds": 8  // How long to show each change
}
```

## 🚀 Current Status: Phase 5

**✅ What Works:**
- Complete end-to-end pipeline
- Mock AI analysis (uses predefined script)
- Real TTS generation
- Real screen recording with Puppeteer
- Smart video/audio synchronization
- Web and CLI testing interfaces

**🔄 Phase 6 (Next):**
- Replace mock AI with real OpenAI analysis
- GitHub OAuth integration
- Database storage for projects
- S3/cloud storage for videos
- Error handling and retries
- Production deployment

## 🎯 Use Cases

**For Developers:**
- Weekly update videos for stakeholders
- Demo videos for pull requests
- Automated documentation of changes

**For Teams:**
- Client update presentations
- Internal progress reports  
- Feature showcase videos

**For Agencies:**
- Client deliverable videos
- Progress documentation
- Professional change summaries

## 🔍 Troubleshooting

### Common Issues

**"404 page not found" during recording:**
- Check `DEPLOYED_SITE_URL` environment variable
- Ensure your website is accessible
- Verify page URLs in the changes array

**Audio/Video duration mismatch:**
- The system automatically handles this by slowing down video
- Check console logs for duration details

**TTS generation fails:**
- Verify `OPENAI_API_KEY` is set correctly
- Check OpenAI API quota/billing

**Puppeteer crashes:**
- Ensure sufficient memory (screen recording is intensive)
- Check if website loads properly in regular browser

### Debug Mode
Enable detailed logging by checking console output during generation. Each step shows progress and timing information.

## 📈 Performance

**Typical Generation Times:**
- AI Analysis: 2-5 seconds (mock) / 10-30 seconds (real)
- TTS Generation: 3-8 seconds
- Screen Recording: 20-60 seconds (depends on content)
- Video Combination: 5-15 seconds
- **Total: 30-120 seconds**

**Resource Usage:**
- CPU: High during screen recording and video processing
- Memory: 500MB-2GB (Puppeteer + FFmpeg)
- Disk: ~50MB per video (temporary files cleaned up)

---

*This pipeline transforms boring code changes into engaging, professional videos that anyone can understand! 🎬✨*