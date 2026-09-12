import { Button } from "../ui/button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-danger">Something went wrong</p>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
