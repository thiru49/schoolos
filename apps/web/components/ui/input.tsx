import { cn } from "../../lib/utils";

type Props = {
  className?: string;
  value?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: { target: { value: string } }) => void;
};

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
