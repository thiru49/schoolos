export function PermissionDenied({ detail }: { detail: string }) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-primary">Permission denied</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}
