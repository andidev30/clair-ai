import { Box, Typography } from '@mui/material';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Clair AI - Tech Interview Management
      </Typography>
    </Box>
  );
}
