import { z } from "zod";
import { toast } from "sonner";

const QuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.string(),
});

export type Question = z.infer<typeof QuestionSchema>;

const QuestionsSchema = z.array(QuestionSchema).length(40);

function extractJson(text: string): string {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1];
  // Fallback: find first [ and last ] to get a JSON array
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

export async function generateQuestionsFromText(apiKey: string, sourceText: string): Promise<Question[]> {
  const prompt = `You are an exam generator. Create exactly 40 high-quality multiple-choice questions (MCQs) from the provided study material. Return ONLY a compact JSON array with 40 objects, NO commentary. Each object must have: 
{
  "question": string,
  "options": [string, string, string, string],
  "answer": string // must equal one of the options exactly
}
Guidelines: 
- Cover diverse concepts across the material
- Keep questions clear and objective
- Avoid ambiguous phrasing
- Ensure the correct answer is present verbatim in options
- Keep options concise
`;

  const body = {
    model: "gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "You output strict JSON when asked. Never include explanations." },
      { role: "user", content: prompt + "\n\nMaterial:\n" + sourceText },
    ],
  } as const;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    toast.error("OpenAI API error");
    throw new Error(`OpenAI error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as any;
  const raw = data.choices?.[0]?.message?.content ?? "";
  const json = extractJson(raw);

  const parsed = JSON.parse(json);
  const questions = QuestionsSchema.parse(parsed);

  return questions;
}
