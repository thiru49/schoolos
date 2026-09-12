import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-dark",
        secondary: "border border-slate-200 bg-white text-ink hover:bg-slate-50",
        ghost: "text-primary hover:bg-primary/10",
        danger: "bg-danger text-white hover:bg-red-700",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type Props = VariantProps<typeof buttonVariants> & {
  className?: string;
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({ className, variant, size, type = "button", ...props }: Props) {
  return <button type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
