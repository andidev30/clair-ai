import { useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4ff',
        px: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: '#fff',
          borderRadius: 4,
          p: { xs: 5, sm: 7 },
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Typography fontWeight={800} color="#fff" fontSize={24}>C</Typography>
        </Box>

        <Typography variant="h4" fontWeight={700} mb={1}>
          Welcome back
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={5}>
          Sign in with your Google account to continue
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box display="flex" justifyContent="center">
          <GoogleLogin
            onSuccess={async (response) => {
              try {
                setError(null);
                if (response.credential) {
                  await login(response.credential);
                }
              } catch {
                setError('Login failed. Please try again.');
              }
            }}
            onError={() => setError('Google login failed. Please try again.')}
            size="large"
            theme="outline"
            shape="rectangular"
            width="400"
          />
        </Box>

        <Typography variant="caption" color="text.disabled" display="block" mt={5}>
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </Typography>
      </Box>
    </Box>
  );
}
