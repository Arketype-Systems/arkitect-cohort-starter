import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="startup-error">
        <h1>This view could not be opened.</h1>
        <p>
          Your saved browser records have not been cleared. Reload to try again,
          or return to data management.
        </p>
        <a className="button secondary" href="/database">
          Data and backup
        </a>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
