import { Chip, Stack } from '@mui/material';

const STAGES = [
  { key: 'warmup', label: 'Warm-up' },
  { key: 'coding', label: 'Coding' },
  { key: 'wrapup', label: 'Wrap-up' },
] as const;

interface StageIndicatorProps {
  currentStage: string;
}

export default function StageIndicator({ currentStage }: StageIndicatorProps) {
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {STAGES.map((stage) => (
        <Chip
          key={stage.key}
          label={stage.label}
          size="small"
          variant={currentStage === stage.key ? 'filled' : 'outlined'}
          color={currentStage === stage.key ? 'primary' : 'default'}
        />
      ))}
    </Stack>
  );
}
