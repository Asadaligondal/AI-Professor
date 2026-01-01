import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export type SubmissionStatus = "processing" | "completed" | "ready_for_evaluation" | "graded";

interface StatusBadgeProps {
  status: SubmissionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "completed":
    case "graded":
      return (
        <Badge variant="outline" className="border-green-600 text-green-700 dark:text-green-400">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="outline" className="border-blue-600 text-blue-700 dark:text-blue-400 animate-pulse">
          <Clock className="mr-1 h-3 w-3" />
          Processing
        </Badge>
      );
    case "ready_for_evaluation":
      return (
        <Badge variant="outline" className="border-purple-600 text-purple-700 dark:text-purple-400">
          <AlertCircle className="mr-1 h-3 w-3" />
          Ready for Evaluation
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-zinc-400 text-zinc-600 dark:text-zinc-400">
          Unknown
        </Badge>
      );
  }
}
