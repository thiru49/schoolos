"use client";

import React, { Component } from "react";
import { ErrorState } from "./error-state";
import { nextBoundaryRetryKey, resolveRenderErrorMessage } from "./error-boundary-policy";

type PageErrorBoundaryProps = {
  children: React.ReactNode;
  section?: string;
};

type PageErrorBoundaryState = {
  error: Error | null;
  retryKey: number;
};

class PageErrorBoundaryImpl extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("[PageErrorBoundary]", error, errorInfo.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState((state) => ({
      error: null,
      retryKey: nextBoundaryRetryKey(state.retryKey),
    }));
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          message={resolveRenderErrorMessage(this.state.error, this.props.section)}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}

// React 19 @types/react can reject class components as JSX; createElement keeps the boundary typed.
export function PageErrorBoundary(props: PageErrorBoundaryProps) {
  return React.createElement(PageErrorBoundaryImpl, props);
}

export { PageErrorBoundaryImpl };
