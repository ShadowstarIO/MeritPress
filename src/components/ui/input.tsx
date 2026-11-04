import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-inset px-3 text-sm text-fg placeholder:text-subtle",
          "transition-colors duration-150",
          className,
        )}
        {...props}
      />
    );
  },
);
