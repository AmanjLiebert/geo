import * as React from "react";
import { cn } from "@/lib/utils";
import styles from "./button.module.css";

export type ButtonVariant = "default" | "outline" | "destructive" | "secondary" | "ghost";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : size === "icon" ? styles.sizeIcon : styles.sizeDefault;
    const variantClass = styles[variant] || styles.default;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(styles.button, variantClass, sizeClass, className)}
        data-slot="button"
        data-ui-action={variant === "default" ? "primary" : variant === "ghost" ? "text" : variant === "outline" ? "secondary" : variant}
        data-variant={variant}
        data-size={size}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
