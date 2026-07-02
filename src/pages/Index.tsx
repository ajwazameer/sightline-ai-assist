import { useState, useEffect, useRef } from 'react';
import { Play, Square, Scan, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CameraView } from '@/components/CameraView';
import { DetectionFeed } from '@/components/DetectionFeed';
import { AudioControls } from '@/components/AudioControls';
import { TextToSpeech } from '@/utils/textToSpeech';
import { useToast } from '@/hooks/use-toast';

interface Detection {
  id: string;
  object: string;
  distance: string;
  confidence: number;
  timestamp: number;
}

const Index = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [mode, setMode] = useState<'obstacle' | 'scene' | 'text'>('obstacle');
  const [aiMessage, setAiMessage] = useState<{ label: string; text: string } | null>(null);
  const ttsRef = useRef<TextToSpeech | null>(null);
  const [isDetectingObstacle, setIsDetectingObstacle] = useState(false);
  // Tracks which obstacles were already announced so we only speak about
  // a given object once while it stays in view, instead of every capture cycle.
  const announcedObjectsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    ttsRef.current = new TextToSpeech();
    
    // Welcome message
    setTimeout(() => {
      ttsRef.current?.speak('Welcome to Sightline AI. Your intelligent vision assistant.');
    }, 1000);

    return () => {
      ttsRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    if (ttsRef.current) {
      ttsRef.current.setVolume(volume);
      ttsRef.current.setMuted(isMuted);
    }
  }, [volume, isMuted]);

  const handleStartScanning = () => {
    setIsScanning(true);
    ttsRef.current?.speak('Starting obstacle detection. I will guide you through your surroundings.', 'high');
    toast({
      title: 'Scanning Started',
      description: 'Sightline AI is now detecting obstacles.',
    });
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    ttsRef.current?.speak('Scanning stopped.', 'high');
    toast({
      title: 'Scanning Stopped',
      description: 'Obstacle detection has been paused.',
    });
  };

  const handleFrame = async (imageData: string) => {
    if (mode !== 'obstacle') return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-scene`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            image: imageData,
            mode: 'obstacle',
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: 'Rate Limit',
            description: 'Too many requests. Slowing down detection.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Failed to analyze frame');
      }

      const data = await response.json();

      if (data.detections && data.detections.length > 0) {
        const currentlySeen = new Set<string>();

        data.detections.forEach((detection: any) => {
          const newDetection: Detection = {
            id: Date.now().toString() + Math.random(),
            object: detection.object,
            distance: detection.distance,
            confidence: detection.confidence,
            timestamp: Date.now(),
          };

          setDetections((prev) => [...prev, newDetection]);

          const objectKey = String(detection.object).toLowerCase().trim();
          currentlySeen.add(objectKey);

          // Only announce high priority obstacles the first time they appear;
          // skip if we already announced this same object last cycle.
          const alreadyAnnounced = announcedObjectsRef.current.has(objectKey);
          if (
            detection.priority === 'high' &&
            detection.confidence > 0.7 &&
            !alreadyAnnounced
          ) {
            const announcement = `${detection.object} detected, ${detection.distance}`;
            ttsRef.current?.speak(announcement, 'high');
          }
        });

        // Objects no longer seen are removed so they'll be re-announced
        // if they come back into view later.
        announcedObjectsRef.current = currentlySeen;
      } else {
        announcedObjectsRef.current = new Set();
      }
    } catch (error) {
      console.error('Error analyzing frame:', error);
    }
  };
// Grabs a single still frame from the live <video> element as a base64 JPEG.
const captureFrame = (): string | null => {
  const video = document.querySelector('video');
  if (!video) return null;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8);
};

// One-shot obstacle check. Doesn't touch the shared `mode` state used by the
// continuous scanning loop, so it can't interrupt or be interrupted by
// Describe Scene / Read Text.
const handleDetectObstacleOnce = async () => {
  if (isDetectingObstacle) return;
  setIsDetectingObstacle(true);
  setAiMessage(null);
  ttsRef.current?.speak('Checking for obstacles.', 'high');

  const imageData = captureFrame();
  if (!imageData) {
    setIsDetectingObstacle(false);
    return;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-scene`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ image: imageData, mode: 'obstacle' }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        toast({
          title: 'Rate Limit',
          description: 'Too many requests. Please wait a moment and try again.',
          variant: 'destructive',
        });
        return;
      }
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.detections && data.detections.length > 0) {
      const newDetections: Detection[] = data.detections.map((d: any) => ({
        id: Date.now().toString() + Math.random(),
        object: d.object,
        distance: d.distance,
        confidence: d.confidence,
        timestamp: Date.now(),
      }));
      setDetections((prev) => [...prev, ...newDetections]);

      const summary = data.detections.map((d: any) => `${d.object}, ${d.distance}`).join('. ');
      ttsRef.current?.speak(summary, 'high');
      setAiMessage({ label: 'Obstacle Check', text: summary });
    } else {
      ttsRef.current?.speak('No obstacles detected right now.', 'high');
      setAiMessage({ label: 'Obstacle Check', text: 'No obstacles detected right now.' });
    }
  } catch (error) {
    console.error('Error detecting obstacle:', error);
    ttsRef.current?.speak('Unable to check for obstacles right now.', 'high');
    setAiMessage({ label: 'Obstacle Check', text: 'Unable to check for obstacles right now.' });
  } finally {
    setIsDetectingObstacle(false);
  }
};
  const handleDescribeScene = async () => {
    setMode('scene');
    setAiMessage(null);
    ttsRef.current?.speak('Analyzing your surroundings. Please wait.', 'high');
    
    // Capture current frame
    const video = document.querySelector('video');
    const canvas = document.createElement('canvas');
    if (!video) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-scene`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            image: imageData,
            mode: 'scene',
          }),
        }
      );

      const data = await response.json();
      if (data.text) {
        ttsRef.current?.speak(data.text, 'high');
        setAiMessage({ label: 'Scene Description', text: data.text });
      }
    } catch (error) {
      console.error('Error describing scene:', error);
      ttsRef.current?.speak('Unable to describe scene at this time.', 'high');
      setAiMessage({ label: 'Scene Description', text: 'Unable to describe scene at this time.' });
    }

    setMode('obstacle');
  };

  const handleReadText = async () => {
    setMode('text');
    ttsRef.current?.speak('Reading text. Please wait.', 'high');
    setAiMessage(null);
    
    // Capture current frame
    const video = document.querySelector('video');
    const canvas = document.createElement('canvas');
    if (!video) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-scene`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            image: imageData,
            mode: 'text',
          }),
        }
      );

      const data = await response.json();
      if (data.text) {
        ttsRef.current?.speak(data.text, 'high');
        setAiMessage({ label: 'Text Read (OCR)', text: data.text });
      }
    } catch (error) {
      console.error('Error reading text:', error);
      ttsRef.current?.speak('Unable to read text at this time.', 'high');
      setAiMessage({ label: 'Text Read (OCR)', text: 'Unable to read text at this time.' });
    }
    
    setMode('obstacle');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shrink-0">
                <Scan className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sightline AI
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground">Intelligent Vision Assistant</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Camera View - Large */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-1">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-6 shadow-xl">
              <div className="aspect-video mb-4 sm:mb-6">
                <CameraView onFrame={handleFrame} isActive={isScanning} />
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {!isScanning ? (
                  <Button
                    size="lg"
                    onClick={handleStartScanning}
                    className="w-full h-14 sm:h-20 text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all shadow-lg"
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    Start Scanning
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStopScanning}
                    className="w-full h-14 sm:h-20 text-base sm:text-lg font-semibold shadow-lg"
                  >
                    <Square className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    Stop Scanning
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDetectObstacleOnce}
                  className="w-full h-14 sm:h-20 text-base sm:text-lg font-semibold"
                  disabled={!isScanning || isDetectingObstacle}
                >
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  {isDetectingObstacle ? 'Detecting...' : 'Detect Obstacle'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDescribeScene}
                  className="w-full h-14 sm:h-20 text-base sm:text-lg font-semibold"
                  disabled={!isScanning}
                >
                  <Scan className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Describe Scene
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReadText}
                  className="w-full h-14 sm:h-20 text-base sm:text-lg font-semibold"
                  disabled={!isScanning}
                >
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Read Text (OCR)
                </Button>
              </div>
            </div>

            {aiMessage && (
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xl">
                <p className="text-xs font-medium uppercase tracking-wide text-primary mb-2">
                  {aiMessage.label}
                </p>
                <p className="text-foreground leading-relaxed">{aiMessage.text}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 order-2">
            {/* Audio Controls */}
            <AudioControls
              isMuted={isMuted}
              volume={volume}
              voiceEnabled={voiceEnabled}
              onMuteToggle={() => setIsMuted(!isMuted)}
              onVolumeChange={(val) => setVolume(val[0])}
              onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
            />

            {/* Detection Feed */}
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xl">
              <DetectionFeed detections={detections} />
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-8 sm:mt-12 grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 text-center hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Scan className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Real-time Detection</h3>
            <p className="text-sm text-muted-foreground">
              Continuously identifies obstacles and alerts you with audio guidance
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 text-center hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Text Recognition</h3>
            <p className="text-sm text-muted-foreground">
              Read signs, labels, and documents aloud using OCR technology
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 text-center hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Scan className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Scene Description</h3>
            <p className="text-sm text-muted-foreground">
              Get detailed descriptions of your environment on demand
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
