import { cn } from "../../lib/cn";

// SECTION: PageHeader
export function PageHeader(props: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const { title, subtitle, right, className } = props;

  return (
    <div className={cn("ui-pageheader", className)}>
      <div className="ui-pageheader__left">
        <div className="ui-pageheader__title">{title}</div>
        {subtitle ? <div className="ui-pageheader__subtitle">{subtitle}</div> : null}
      </div>
      {right ? <div className="ui-pageheader__right">{right}</div> : null}
    </div>
  );
}