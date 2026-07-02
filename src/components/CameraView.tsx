import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CameraViewProps {
  onFrame: (imageData: string) => void;
  isActive: boolean;
}

export const CameraView = ({ onFrame, isActive }: CameraViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  // Keep a ref to the latest onFrame so the interval below never runs
  // against a stale closure (which previously caused obstacle detection
  // to keep firing even after switching to "Describe Scene" or "Read Text").
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (isActive && !stream) {
      startCamera();
    } else if (!isActive && stream) {
      stopCamera();
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !stream) return;

    const interval = setInterval(() => {
      captureFrame();
    }, 5000); // Capture frame every 5 seconds (keeps us under free-tier rate limits)

    return () => clearInterval(interval);
  }, [isActive, stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Access Denied',
        description: 'Please allow camera access to use Sightline AI.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    onFrameRef.current(imageData);
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-muted">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {!hasPermission && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm">
          <Camera className="w-16 h-16 mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground mb-2">Camera Access Required</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Sightline AI needs camera access to detect obstacles and assist you.
          </p>
        </div>
      )}
    </div>
  );
};
