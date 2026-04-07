import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Eternity Game Studio's AI game generator. You produce a SINGLE, self-contained HTML file that runs a complete playable game using Phaser 3 loaded from CDN.

CRITICAL RULES:
1. Output ONLY the HTML code. No markdown, no explanation, no backticks.
2. The HTML must include <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
3. The game must be fully playable with keyboard controls (arrow keys + space/enter).
4. Include a visible HUD showing score, health, or relevant stats.
5. The game must fit any screen size using Phaser.Scale.FIT with autoCenter.
6. Use procedural graphics (rectangles, circles, lines, text) — no external assets.
7. Include at least: player movement, a goal/objective, a lose condition, and a restart mechanism.
8. Add particle effects, screen shake, or visual juice where appropriate.
9. Set the background to a dark colour (#0a0a1a or similar).
10. Include a title screen with the game name and "Press SPACE to start".
11. Add sound effects using Phaser's built-in audio generation (oscillator/WebAudio) if possible, otherwise skip audio.
12. The game MUST be fun and polished — not a bare tech demo.

STYLE:
- Neon/retro aesthetic with glowing colours
- Smooth animations and transitions
- Professional UI text using Phaser text objects

The entire output must be a valid HTML document starting with <!DOCTYPE html> and nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Create this game: ${prompt}`,
            },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("generate-game error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
