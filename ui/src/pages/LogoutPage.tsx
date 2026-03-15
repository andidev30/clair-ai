import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function LogoutPage() {
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
          maxWidth: 440,
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

        <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1.5 }} />

        <Typography variant="h5" fontWeight={700} mb={1}>
          You've been signed out
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          Thanks for using Clair AI. See you next time!
        </Typography>

        <Button
          component={RouterLink}
          to="/login"
          variant="contained"
          fullWidth
          sx={{
            borderRadius: 2,
            py: 1.25,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
            mb: 1.5,
          }}
        >
          Sign back in
        </Button>

        <Button
          component={RouterLink}
          to="/"
          variant="text"
          fullWidth
          sx={{ borderRadius: 2, py: 1.25, color: 'text.secondary' }}
        >
          Back to home
        </Button>
      </Box>
    </Box>
  );
}
