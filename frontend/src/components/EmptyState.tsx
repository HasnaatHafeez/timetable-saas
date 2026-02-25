import { FileQuestion } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

const EmptyState = ({ title, description, action, icon }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
    <div className="mb-4 rounded-full bg-muted p-4">
      {icon || <FileQuestion className="h-8 w-8 text-muted-foreground" />}
    </div>
    <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
    {description && <p className="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action}
  </div>
);

export default EmptyState;
