import React from "react";
import type { ScreenId } from "../state/navigation";

interface ScreenErrorBoundaryProps {
  screenId: ScreenId;
  onGoDashboard: () => void;
  children: React.ReactNode;
}

interface ScreenErrorBoundaryState {
  error: Error | null;
}

export default class ScreenErrorBoundary extends React.Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Screen render failure:", {
      screenId: this.props.screenId,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack
    });
  }

  componentDidUpdate(prevProps: ScreenErrorBoundaryProps) {
    if (prevProps.screenId !== this.props.screenId && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <section className="screen-grid">
          <div className="panel large">
            <h2>Screen Load Problem</h2>
            <p className="muted">
              Quantum hit a renderer error while opening the <strong>{this.props.screenId}</strong> screen.
            </p>
            <p className="muted">
              Error: {this.state.error.message || "Unknown renderer error"}
            </p>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={this.props.onGoDashboard}>
                Go To Dashboard
              </button>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
