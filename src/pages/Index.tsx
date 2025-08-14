import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { extractTextFromPDF } from "@/lib/pdf";

// Question type definition
export type Question = {
  question: string;
  options: string[];
  answer: string;
};
import { ExamQuestion } from "@/components/exam/ExamQuestion";
import { ResultQuestion } from "@/components/exam/ResultQuestion";

const Index = () => {
  
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "generating" | "ready" | "exam" | "results">("idle");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);


  const canStart = stage === "ready" && questions && questions.length === 40;
  const canSubmit = stage === "exam" && questions && answers.length === questions.length;

  const unansweredCount = useMemo(() => {
    if (!questions) return 0;
    return questions.reduce((acc, _, idx) => (answers[idx] ? acc : acc + 1), 0);
  }, [answers, questions]);

  const handleGenerate = async () => {
    if (!file) {
      toast.error("Please upload a PDF file");
      return;
    }
    setStage("generating");
    try {
      toast.info("Parsing PDF...");
      const text = await extractTextFromPDF(file);
      if (!text || text.length < 200) {
        toast.warning("PDF text seems very short. Results may be limited.");
      }
      
      toast.info("Generating questions with OpenAI...", { duration: 3000 });
      
      const response = await fetch('https://gkbtmxnxglhrugrjajsr.supabase.co/functions/v1/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate questions');
      }

      const { questions } = await response.json();
      setQuestions(questions);
      setAnswers(new Array(questions.length).fill(""));
      setStage("ready");
      toast.success("Questions generated successfully!");
    } catch (error) {
      console.error("Generate error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate questions");
      setStage("idle");
    }
  };

  const handleStart = () => {
    if (!questions) return;
    setStage("exam");
  };

  const handleSubmit = () => {
    if (!questions) return;
    const total = questions.reduce((sum, q, idx) => sum + (answers[idx] === q.answer ? 1 : 0), 0);
    setScore(total);
    setStage("results");
  };

  const handleReset = () => {
    setStage("idle");
    setQuestions(null);
    setAnswers([]);
    setScore(0);
    setFile(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container py-6 flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Lesson Quizzer</h1>
          <p className="text-muted-foreground">Turn any PDF handout into a 40-question objective exam.</p>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {stage === "idle" || stage === "generating" || stage === "ready" ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>Select your study material or handout to generate practice questions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleGenerate} 
                  disabled={!file || stage === "generating"}
                  size="lg"
                >
                  {stage === "generating" ? "Generating..." : "Generate Questions"}
                </Button>
                {canStart && <Button variant="secondary" onClick={handleStart} size="lg">Start Exam</Button>}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {stage === "exam" && questions && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Exam</h2>
              <div className="text-sm text-muted-foreground">Unanswered: {unansweredCount}</div>
            </div>
            <Separator />
            <div className="grid gap-5">
              {questions.map((q, idx) => (
                <ExamQuestion
                  key={idx}
                  index={idx}
                  q={q}
                  selected={answers[idx]}
                  onChange={(val) => {
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[idx] = val;
                      return next;
                    });
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStage("ready")}>Back</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>Submit Exam</Button>
            </div>
          </section>
        )}

        {stage === "results" && questions && (
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  Score: <span className="font-semibold">{score}</span> / {questions.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setStage("exam")}>Back to Exam</Button>
                <Button onClick={handleReset}>Start Over</Button>
              </CardContent>
            </Card>

            <div className="grid gap-5">
              {questions.map((q, idx) => (
                <ResultQuestion key={idx} index={idx} q={q} picked={answers[idx]} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t mt-10">
        <div className="container py-6 text-sm text-muted-foreground">
          <p>Built for students — PDF parsing happens in your browser, questions generated with OpenAI.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
