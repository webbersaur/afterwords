import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recap_id, audio_path } = await req.json();

    if (!recap_id || !audio_path) {
      return new Response(
        JSON.stringify({ error: "recap_id and audio_path are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Init Supabase service client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update recap status
    await supabase
      .from("recaps")
      .update({ status: "transcribing" })
      .eq("id", recap_id);

    // Download audio from storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("recordings")
      .download(audio_path);

    if (downloadError) {
      throw new Error(`Failed to download audio: ${downloadError.message}`);
    }

    // Send to Whisper API
    const formData = new FormData();
    formData.append("file", audioData, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        },
        body: formData,
      }
    );

    if (!whisperResponse.ok) {
      const err = await whisperResponse.text();
      throw new Error(`Whisper API error: ${err}`);
    }

    const { text: transcript } = await whisperResponse.json();

    // Save transcript to database
    await supabase
      .from("recaps")
      .update({ transcript, status: "summarizing", updated_at: new Date().toISOString() })
      .eq("id", recap_id);

    return new Response(
      JSON.stringify({ recap_id, transcript }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Update recap with error
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
