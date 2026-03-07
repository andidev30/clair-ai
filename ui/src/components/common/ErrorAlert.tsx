import { Alert } from '@mui/material';

interface ErrorAlertProps {
  message?: string;
}

export default function ErrorAlert({
  message = 'Something went wrong. Please try again.',
}: ErrorAlertProps) {
  return (
    <Alert severity="error" sx={{ my: 2 }}>
      {message}
    </Alert>
  );
}
