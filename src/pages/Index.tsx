import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { extractTextFromPDF } from "@/lib/pdf";
import { generateQuestionsFromText, type Question } from "@/lib/openai";
import { ExamQuestion } from "@/components/exam/ExamQuestion";
import { ResultQuestion } from "@/components/exam/ResultQuestion";

const Index = () => {
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem("openai_api_key") || "");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "generating" | "ready" | "exam" | "results">("idle");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem("openai_api_key", apiKey);
  }, [apiKey]);

  const canStart = stage === "ready" && questions && questions.length === 40;
  const canSubmit = stage === "exam" && questions && answers.length === questions.length;

  const unansweredCount = useMemo(() => {
    if (!questions) return 0;
    return questions.reduce((acc, _, idx) => (answers[idx] ? acc : acc + 1), 0);
  }, [answers, questions]);

  const handleGenerate = async () => {
    if (!apiKey) {
      toast.error("Please enter your OpenAI API key");
      return;
    }
    if (!file) {
      toast.error("Please upload a PDF to continue");
      return;
    }

    try {
      setStage("generating");
      toast.info("Parsing PDF...");
      const text = await extractTextFromPDF(file);
      if (!text || text.length < 200) {
        toast.warning("PDF text seems very short. Results may be limited.");
      }
      toast.info("Generating questions with OpenAI...", { duration: 2000 });
      const qs = await generateQuestionsFromText(apiKey, text);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(""));
      setStage("ready");
      toast.success("Questions ready! Click Start Exam.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate questions");
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
          <section className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>1) OpenAI API Key</CardTitle>
                <CardDescription>Stored locally in your browser. You can remove it anytime.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Tip: For team use, we recommend connecting Supabase and storing secrets server-side.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2) Upload PDF</CardTitle>
                <CardDescription>We parse your PDF fully in the browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="pdf">Student handout (PDF)</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button onClick={handleGenerate} disabled={stage === "generating"}>
                    {stage === "generating" ? "Working..." : "Parse & Generate Questions"}
                  </Button>
                  {canStart && <Button variant="secondary" onClick={handleStart}>Start Exam</Button>}
                </div>
              </CardContent>
            </Card>
          </section>
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
          <p>Built for students — all processing stays in your browser, except the OpenAI request.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
