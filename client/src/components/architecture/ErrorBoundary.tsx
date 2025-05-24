import { Component, ErrorInfo, ReactNode } from 'react';
import { Typography, Button, Paper, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ReactFlow Error Boundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Paper 
          sx={{ 
            p: 4, 
            m: 2, 
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'error.light'
          }}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              System Architecture Diagram Error
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The diagram encountered an error and couldn't render properly.
            </Typography>
            {this.state.error && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                {this.state.error.message}
              </Typography>
            )}
          </Alert>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={this.handleRetry}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Paper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;