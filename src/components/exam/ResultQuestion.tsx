import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Question } from "@/pages/Index";

interface ResultQuestionProps {
  index: number;
  q: Question;
  picked?: string;
}

export function ResultQuestion({ index, q, picked }: ResultQuestionProps) {
  const correct = picked === q.answer;
  return (
    <Card className={`p-5 space-y-3 border ${correct ? "border-accent" : "border-destructive/60"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-secondary px-2 py-1 text-sm text-secondary-foreground">Q{index + 1}</div>
          <h3 className="font-medium">{q.question}</h3>
        </div>
        <Badge variant={correct ? "secondary" : "destructive"}>{correct ? "Correct" : "Incorrect"}</Badge>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Your answer:</span>
          <span className={correct ? "" : "line-through opacity-70"}>{picked ?? "No selection"}</span>
        </div>
        {!correct && (
          <div className="flex items-center gap-2">
            <span className="font-semibold">Correct answer:</span>
            <span>{q.answer}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
