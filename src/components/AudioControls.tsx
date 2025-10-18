import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioControlsProps {
  isMuted: boolean;
  volume: number;
  voiceEnabled: boolean;
  onMuteToggle: () => void;
  onVolumeChange: (value: number[]) => void;
  onVoiceToggle: () => void;
}

export const AudioControls = ({
  isMuted,
  volume,
  voiceEnabled,
  onMuteToggle,
  onVolumeChange,
  onVoiceToggle,
}: AudioControlsProps) => {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Volume2 className="w-5 h-5 text-primary" />
          )}
          <span className="font-medium text-foreground">Audio Output</span>
        </div>
        <Button
          variant={isMuted ? 'outline' : 'default'}
          size="sm"
          onClick={onMuteToggle}
          className="transition-all"
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Volume</label>
        <Slider
          value={[volume]}
          onValueChange={onVolumeChange}
          max={100}
          step={1}
          disabled={isMuted}
          className="w-full"
        />
      </div>

      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {voiceEnabled ? (
              <Mic className="w-5 h-5 text-secondary" />
            ) : (
              <MicOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <span className="font-medium text-foreground block">Voice Commands</span>
              <span className="text-xs text-muted-foreground">Say "describe scene" or "read text"</span>
            </div>
          </div>
          <Button
            variant={voiceEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={onVoiceToggle}
            className="transition-all"
          >
            {voiceEnabled ? 'On' : 'Off'}
          </Button>
        </div>
      </div>
    </div>
  );
};
