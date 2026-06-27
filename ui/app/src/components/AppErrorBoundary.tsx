import React from "react";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App render failure:", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <main className="main-area">
            <section className="screen-grid">
              <div className="panel large">
                <h2>App Load Problem</h2>
                <p className="muted">
                  SkillSpring Quantum hit a renderer error before the normal screen layout finished loading.
                </p>
                <p className="muted">
                  Error: {this.state.error.message || "Unknown renderer error"}
                </p>
              </div>
            </section>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
