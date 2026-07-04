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
      const errorMessage = this.state.error.message || "Unknown renderer error";
      const looksLikeInitializationBug = /before initialization/i.test(errorMessage);

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
                  Error: {errorMessage}
                </p>
                {looksLikeInitializationBug ? (
                  <p className="muted">
                    This usually means a screen tried to use one of its own values too early. Go back to Imports or Dashboard, then retry after updating to the latest build.
                  </p>
                ) : (
                  <p className="muted">
                    Try returning to Dashboard or Imports first. If the same screen keeps failing, refresh to the latest build and rerun the same path so the error can be traced.
                  </p>
                )}
              </div>
            </section>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
