import { cn } from "../../lib/cn";

// SECTION: types
type BadgeVariant = "neutral" | "accent";

// SECTION: Badge
export function Badge(
  props: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }
) {
  const { className, variant = "neutral", ...rest } = props;

  return (
    <span
      className={cn(
        "ui-badge",
        variant === "neutral" && "ui-badge--neutral",
        variant === "accent" && "ui-badge--accent",
        className
      )}
      {...rest}
    />
  );
}