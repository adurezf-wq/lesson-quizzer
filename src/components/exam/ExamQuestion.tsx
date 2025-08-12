import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import type { Question } from "@/lib/openai";

interface ExamQuestionProps {
  index: number;
  q: Question;
  selected?: string;
  onChange: (value: string) => void;
}

export function ExamQuestion({ index, q, selected, onChange }: ExamQuestionProps) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-secondary px-2 py-1 text-sm text-secondary-foreground">Q{index + 1}</div>
        <h2 className="text-lg font-semibold leading-snug">{q.question}</h2>
      </div>

      <RadioGroup value={selected} onValueChange={onChange} className="grid gap-3">
        {q.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 hover:bg-accent/30 transition-colors">
            <RadioGroupItem id={`q${index}-opt${i}`} value={opt} />
            <Label htmlFor={`q${index}-opt${i}`} className="cursor-pointer leading-snug">
              {opt}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </Card>
  );
}
