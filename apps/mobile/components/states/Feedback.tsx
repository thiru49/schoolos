import React from "react";
import {
  EmptyState as NewEmptyState,
  ErrorState as NewErrorState,
  PermissionDenied,
  OfflineBanner,
} from "../feedback";

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <NewEmptyState title={title} detail={detail} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <NewErrorState message={message} onRetry={onRetry} />;
}

export function DeniedState({ detail, title }: { detail: string; title?: string }) {
  return <PermissionDenied title={title} detail={detail} />;
}

export function OfflineState({ onRetry }: { onRetry: () => void }) {
  return <NewErrorState title="You appear to be offline" message="Please check your connection." onRetry={onRetry} />;
}

export { OfflineBanner, PermissionDenied };
