import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a medical visit summarizer for cancer patients and their families.
Given a transcript of a doctor-patient conversation, extract and organize the information into these sections.

Return ONLY valid JSON with this exact structure:
{
  "title": "Brief visit title (e.g., 'Post-Surgery Results Call — Pathology Review')",
  "diagnosis": {
    "summary": "Plain-language diagnosis summary (2-3 sentences)",
    "details": ["Array of key diagnostic findings"]
  },
  "treatment_plan": [
    {
      "type": "e.g., Surgery, Radiation, Chemotherapy",
      "description": "What it involves",
      "details": "Timeline, duration, expectations"
    }
  ],
  "key_findings": [
    {
      "finding": "Finding name",
      "detail": "What it means",
      "significance": "Why it matters for the patient"
    }
  ],
  "action_items": [
    "Specific next step the patient needs to take"
  ],
  "follow_up_questions": [
    "Question the patient may want to ask at their next visit"
  ]
}

Guidelines:
- Use plain, non-medical language wherever possible
- If a medical term is necessary, include a brief explanation
- Be accurate — do not infer information not present in the transcript
- Focus on what matters most to the patient
- Action items should be concrete and actionable`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recap_id } = await req.json();

    if (!recap_id) {
      return new Response(
        JSON.stringify({ error: "recap_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the transcript
    const { data: recap, error: fetchError } = await supabase
      .from("recaps")
      .select("transcript")
      .eq("id", recap_id)
      .single();

    if (fetchError || !recap?.transcript) {
      throw new Error("Recap not found or transcript missing");
    }

    // Update status
    await supabase
      .from("recaps")
      .update({ status: "summarizing" })
      .eq("id", recap_id);

    // Call Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here is the transcript of a doctor-patient conversation. Please summarize it:\n\n${recap.transcript}`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeResponse.json();
    const summaryText = claudeData.content[0].text;

    // Parse the JSON from Claude's response
    let summary;
    try {
      // Handle case where Claude wraps in markdown code block
      const jsonMatch = summaryText.match(/```json\n?([\s\S]*?)\n?```/) ||
                        summaryText.match(/```\n?([\s\S]*?)\n?```/);
      summary = JSON.parse(jsonMatch ? jsonMatch[1] : summaryText);
    } catch {
      throw new Error("Failed to parse summary JSON from Claude");
    }

    // Save summary to database
    await supabase
      .from("recaps")
      .update({
        summary,
        title: summary.title || "Visit Recap",
        status: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recap_id);

    return new Response(
      JSON.stringify({ recap_id, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    try {
      const { recap_id } = await req.clone().json().catch(() => ({}));
      if (recap_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("recaps")
          .update({ status: "error", error_message: error.message })
          .eq("id", recap_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
