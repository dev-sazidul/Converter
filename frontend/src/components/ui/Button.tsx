import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn, focusRing } from "@/lib/utils";

const buttonStyles = cva(
  `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`,
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-sm hover:bg-primary-dark",
        secondary: "border border-line bg-white text-ink hover:border-primary/40 hover:bg-primary-soft",
        quiet: "bg-transparent text-ink hover:bg-primary-soft",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        md: "h-11 px-4",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
