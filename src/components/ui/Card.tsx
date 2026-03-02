import { cn } from "../../lib/cn";

// SECTION: Card
export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cn("ui-card", className)} {...rest} />;
}

// SECTION: CardTitle
export function CardTitle(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cn("ui-card__title", className)} {...rest} />;
}

// SECTION: CardBody
export function CardBody(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cn("ui-card__body", className)} {...rest} />;
}