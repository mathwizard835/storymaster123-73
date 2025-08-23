import React from 'react';
import { Button } from './ui/button';
import { RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="glass-panel rounded-xl p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. You can try reloading the page or return home.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.resetError} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="default">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;