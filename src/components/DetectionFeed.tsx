import { AlertCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Detection {
  id: string;
  object: string;
  distance: string;
  confidence: number;
  timestamp: number;
}

interface DetectionFeedProps {
  detections: Detection[];
}

export const DetectionFeed = ({ detections }: DetectionFeedProps) => {
  const recentDetections = detections.slice(-5).reverse();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Recent Detections</h3>
      </div>

      {recentDetections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No detections yet. Start scanning to detect obstacles.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentDetections.map((detection) => (
            <div
              key={detection.id}
              className="bg-card border border-border rounded-xl p-4 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground capitalize mb-1">
                    {detection.object}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Distance: {detection.distance}
                  </p>
                </div>
                <Badge
                  variant={detection.confidence > 0.7 ? 'default' : 'secondary'}
                  className="shrink-0"
                >
                  {Math.round(detection.confidence * 100)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
