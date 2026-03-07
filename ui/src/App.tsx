import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

export default function App() {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Header />
      <Outlet />
      <Footer />
    </Box>
  );
}
