import { cn } from "../../lib/cn";

// SECTION: types
type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

// SECTION: Button
export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
) {
  const { className, variant = "primary", size = "md", ...rest } = props;

  return (
    <button
      className={cn(
        "ui-btn",
        variant === "primary" && "ui-btn--primary",
        variant === "secondary" && "ui-btn--secondary",
        variant === "ghost" && "ui-btn--ghost",
        size === "sm" && "ui-btn--sm",
        size === "md" && "ui-btn--md",
        className
      )}
      {...rest}
    />
  );
}