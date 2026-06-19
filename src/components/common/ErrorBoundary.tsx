import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[LifeLayers] App render failed.", error, errorInfo);
    }
  }

  private reloadApp = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-shell app-error-shell">
        <section className="state-block error-state app-error" role="alert">
          <div className="state-glyph" aria-hidden="true" />
          <div>
            <h1>LifeLayers hit a display problem</h1>
            <p>Reload the app to get back to your map and saved planning state.</p>
            <button className="state-action" type="button" onClick={this.reloadApp}>
              Reload app
            </button>
            {import.meta.env.DEV && (
              <details>
                <summary>Developer details</summary>
                <pre>{this.state.error.stack ?? this.state.error.message}</pre>
              </details>
            )}
          </div>
        </section>
      </main>
    );
  }
}
