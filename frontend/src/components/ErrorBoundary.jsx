import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#020617] text-white p-6 text-center">
          <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-6 text-4xl">
            ⚠️
          </div>
          <h1 className="text-3xl font-black mb-4">Something went wrong</h1>
          <p className="text-muted max-w-md mb-8">
            The application encountered an unexpected error. We've been notified and are working to fix it.
          </p>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-left mb-8 max-w-2xl overflow-auto font-mono text-xs">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary px-10 py-3"
          >
            Refresh Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
