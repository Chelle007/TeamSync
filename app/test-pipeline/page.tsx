'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function TestPipelinePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testPayload = {
    projectId: 'PR_BROWSER_TEST', // Can be any identifier like "PR_5", "TEST_123", etc.
    commits: [
      // Note: For Phase 5, we use mock data regardless of these values
      // In Phase 6, these will be processed by real AI
      {
        sha: 'abc123',
        message: 'Update footer color to neon green',
        author: 'Desmond',
        date: '2026-01-17',
        files: ['styles/footer.css']
      },
      {
        sha: 'def456', 
        message: 'Change font family to Montserrat',
        author: 'Desmond',
        date: '2026-01-17',
        files: ['styles/globals.css']
      }
    ],
    documents: [
      {
        name: 'README.md',
        content: 'Event website with modern styling'
      }
    ]
  };

  const runPipeline = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/generate-full-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Pipeline failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Video Generation Pipeline Test</h1>
        <p className="text-gray-600">Test the complete AI → TTS → Screen Recording → Video Combination pipeline</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>This will test with mock commit data</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={JSON.stringify(testPayload, null, 2)}
            readOnly
            className="h-40 font-mono text-sm"
          />
          <Button 
            onClick={runPipeline} 
            disabled={isGenerating}
            className="mt-4"
          >
            {isGenerating ? 'Generating Video...' : 'Run Full Pipeline'}
          </Button>
        </CardContent>
      </Card>

      {isGenerating && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Generating video... This may take 30-60 seconds</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mb-6 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-600">Success! 🎉</CardTitle>
            <CardDescription>Video generated successfully</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Final Video</h3>
                <video 
                  controls 
                  className="w-full max-w-2xl rounded-lg"
                  src={result.finalVideoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Generated Script</h3>
                <p className="bg-gray-50 p-3 rounded text-sm">{result.summary.script}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Changes Detected</h3>
                <ul className="space-y-2">
                  {result.summary.changes.map((change, i) => (
                    <li key={i} className="bg-gray-50 p-3 rounded text-sm">
                      <strong>{change.title}</strong> ({change.duration_seconds}s)
                      <br />
                      <span className="text-gray-600">{change.description}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Technical Details</h3>
                <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                  <div>Project ID: {result.projectId}</div>
                  <div>Report Key: {result.reportKey}</div>
                  <div>Video Duration: {result.durations.videoDuration}s</div>
                  <div>Audio Duration: {result.durations.audioDuration}s</div>
                  <div>Generated: {new Date(result.generatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}