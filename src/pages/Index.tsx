import { useState, useEffect, useRef } from 'react';
import { Play, Square, Scan, FileText } from 'lucide-react';
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
  const ttsRef = useRef<TextToSpeech | null>(null);
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
    // This will be connected to Lovable AI for real detection
    // For now, simulate detection
    const mockDetections = [
      { object: 'person', distance: '2 meters ahead', confidence: 0.92 },
      { object: 'chair', distance: '1 meter to the right', confidence: 0.85 },
      { object: 'table', distance: '3 meters ahead', confidence: 0.78 },
      { object: 'door', distance: '5 meters ahead', confidence: 0.88 },
    ];

    const randomDetection = mockDetections[Math.floor(Math.random() * mockDetections.length)];
    const newDetection: Detection = {
      id: Date.now().toString(),
      ...randomDetection,
      timestamp: Date.now(),
    };

    setDetections((prev) => [...prev, newDetection]);
    
    // Announce critical obstacles
    if (randomDetection.confidence > 0.8) {
      const announcement = `${randomDetection.object} detected, ${randomDetection.distance}`;
      ttsRef.current?.speak(announcement, 'high');
    }
  };

  const handleDescribeScene = () => {
    setMode('scene');
    ttsRef.current?.speak('Analyzing your surroundings. Please wait.', 'high');
    setTimeout(() => {
      ttsRef.current?.speak(
        'You are in a room. There is a person two meters ahead. A chair is one meter to your right. A door is visible five meters ahead.',
        'high'
      );
    }, 2000);
  };

  const handleReadText = () => {
    setMode('text');
    ttsRef.current?.speak('Text reading mode activated. Point camera at text.', 'high');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Scan className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sightline AI
                </h1>
                <p className="text-xs text-muted-foreground">Intelligent Vision Assistant</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera View - Large */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              <div className="aspect-video mb-6">
                <CameraView onFrame={handleFrame} isActive={isScanning} />
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-2 gap-4">
                {!isScanning ? (
                  <Button
                    size="lg"
                    onClick={handleStartScanning}
                    className="w-full h-20 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all shadow-lg"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Start Scanning
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStopScanning}
                    className="w-full h-20 text-lg font-semibold shadow-lg"
                  >
                    <Square className="w-6 h-6 mr-2" />
                    Stop Scanning
                  </Button>
                )}

                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDescribeScene}
                  className="w-full h-20 text-lg font-semibold"
                  disabled={!isScanning}
                >
                  <Scan className="w-6 h-6 mr-2" />
                  Describe Scene
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReadText}
                  className="w-full h-20 text-lg font-semibold col-span-2"
                  disabled={!isScanning}
                >
                  <FileText className="w-6 h-6 mr-2" />
                  Read Text (OCR)
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              <DetectionFeed detections={detections} />
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Scan className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Real-time Detection</h3>
            <p className="text-sm text-muted-foreground">
              Continuously identifies obstacles and alerts you with audio guidance
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Text Recognition</h3>
            <p className="text-sm text-muted-foreground">
              Read signs, labels, and documents aloud using OCR technology
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg transition-all">
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
