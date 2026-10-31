import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ensureSeeded } from "./lib/db";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <main className="startup-error" role="status">
    Opening your assessment workspace…
  </main>,
);
ensureSeeded()
  .then(() =>
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <RouterProvider
            router={createBrowserRouter([{ path: "*", element: <App /> }])}
          />
        </ErrorBoundary>
      </StrictMode>,
    ),
  )
  .catch(() => {
    root.render(
      <main className="startup-error">
        <h1>Browser storage could not be opened.</h1>
        <p>
          Your records have not been reset. Check that this browser allows site
          storage, close other copies of the app and try again.
        </p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>,
    );
  });
