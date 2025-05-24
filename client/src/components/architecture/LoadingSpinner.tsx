import React from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  variant?: 'spinner' | 'skeleton';
  height?: string | number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Loading system architecture...", 
  variant = 'spinner',
  height = 400
}) => {
  if (variant === 'skeleton') {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="rectangular" width="20%" height={40} />
          <Skeleton variant="rectangular" width="20%" height={40} />
          <Skeleton variant="rectangular" width="20%" height={40} />
          <Skeleton variant="rectangular" width="20%" height={40} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={height} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: typeof height === 'number' ? `${height}px` : height,
        gap: 2
      }}
    >
      <CircularProgress size={48} thickness={4} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;