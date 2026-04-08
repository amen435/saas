import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:8081";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, difficulty, questionType, count, instructions, subject } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const typeGuide = {
      MCQ: "multiple choice questions with 4 options (A-D) and the correct answer marked",
      Short: "short answer questions requiring 1-3 sentence responses",
      Long: "long answer/essay questions requiring detailed explanations",
      Mixed: "a mix of MCQ, short answer, and long answer questions",
    };

    const systemPrompt = `You are an expert academic question generator for school teachers. Generate high-quality homework questions that are pedagogically sound, age-appropriate, and aligned with standard curricula. Format questions clearly with numbering. For MCQ questions, always include 4 options and mark the correct answer.`;

    const userPrompt = `Generate exactly ${count} ${typeGuide[questionType] || typeGuide.Mixed} about "${topic}" for a ${subject || "General"} class.

Difficulty level: ${difficulty}
${instructions ? `Additional instructions from the teacher: ${instructions}` : ""}

Format each question clearly with Q1, Q2, etc. For MCQ questions use A), B), C), D) format and indicate the correct answer.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const questions = data.choices?.[0]?.message?.content || "No questions generated.";

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-homework error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
