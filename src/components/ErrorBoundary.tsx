import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: any;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    if ((this as any).props.onReset) {
      (this as any).props.onReset();
    }
  };

  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-[250px] p-6 bg-slate-900/90 border border-red-500/30 rounded-2xl text-slate-100 flex flex-col items-center justify-center text-center space-y-4 m-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {(this as any).props.fallbackMessage || "An Unexpected View Error Occurred"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              {(this as any).state.error?.message || "The application encountered an unexpected render issue. You can safely retry or reload."}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            <span>Retry & Restore View</span>
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
