import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Question {
  question: string;
  options: string[];
  answer: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || text.length < 100) {
      return new Response(
        JSON.stringify({ error: 'PDF text is too short to generate meaningful questions' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating questions from text of length:', text.length);

    const prompt = `You are an exam generator. Create exactly 40 high-quality multiple-choice questions (MCQs) from the provided study material. Return ONLY a valid JSON array with 40 objects, NO commentary or markdown formatting. Each object must have exactly this structure:

{
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "answer": "string"
}

Important requirements:
- The "answer" field must exactly match one of the 4 options
- Questions should cover diverse concepts from the material
- Keep questions clear and objective
- Avoid ambiguous phrasing
- Each question should have exactly 4 options
- Return only the JSON array, no other text

Study material:
${text}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert exam generator. You always return valid JSON arrays when asked. Never include markdown formatting or explanations.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate questions with OpenAI' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Raw OpenAI response:', generatedContent);

    // Extract JSON from the response (in case there's extra formatting)
    let jsonString = generatedContent.trim();
    
    // Remove markdown code blocks if present
    const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }
    
    // Find JSON array bounds
    const startIndex = jsonString.indexOf('[');
    const endIndex = jsonString.lastIndexOf(']');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonString = jsonString.slice(startIndex, endIndex + 1);
    }

    try {
      const questions: Question[] = JSON.parse(jsonString);
      
      // Validate the structure
      if (!Array.isArray(questions) || questions.length !== 40) {
        console.error('Invalid questions array length:', questions.length);
        return new Response(
          JSON.stringify({ error: 'Generated questions do not meet the required format (expected 40 questions)' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate each question
      for (const q of questions) {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.answer) {
          console.error('Invalid question structure:', q);
          return new Response(
            JSON.stringify({ error: 'Generated questions have invalid structure' }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Ensure answer matches one of the options
        if (!q.options.includes(q.answer)) {
          console.error('Answer not found in options for question:', q.question);
          return new Response(
            JSON.stringify({ error: 'Generated questions have mismatched answers' }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      console.log('Successfully generated', questions.length, 'questions');

      return new Response(JSON.stringify({ questions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('Failed to parse questions JSON:', parseError, 'Raw content:', jsonString);
      return new Response(
        JSON.stringify({ error: 'Failed to parse generated questions' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});