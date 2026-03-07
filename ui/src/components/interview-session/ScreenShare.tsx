import { Button } from '@mui/material';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';

interface ScreenShareProps {
  isSharing: boolean;
  onToggle: () => void;
}

export default function ScreenShare({ isSharing, onToggle }: ScreenShareProps) {
  return (
    <Button
      variant={isSharing ? 'contained' : 'outlined'}
      color={isSharing ? 'error' : 'primary'}
      startIcon={isSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
      onClick={onToggle}
      size="small"
    >
      {isSharing ? 'Stop Sharing' : 'Share Screen'}
    </Button>
  );
}
