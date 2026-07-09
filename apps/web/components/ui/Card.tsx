import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface IconCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function IconCard({ icon, title, description, className }: IconCardProps) {
  return (
    <Card className={className}>
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
        {icon}
      </div>
      <div className="text-heading-2 mb-1">{title}</div>
      <div className="text-body text-neutral">{description}</div>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeDirection?: "up" | "down";
  children?: ReactNode; // sparkline / mini chart
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeDirection = "up",
  children,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <div className="text-small text-neutral mb-2">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-display-2">{value}</div>
        {change && (
          <span
            className={cn(
              "text-small font-medium",
              changeDirection === "up" ? "text-success" : "text-danger"
            )}
          >
            {changeDirection === "up" ? "↑" : "↓"} {change}
          </span>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </Card>
  );
}
