import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENGINE_MAP: Record<string, { name: string; cdn: string; note: string }> = {
  phaser: {
    name: "Phaser 3",
    cdn: "https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js",
    note: "Best for 2D arcade, platformers, top-down, side-scrollers, puzzle, retro games.",
  },
  threejs: {
    name: "Three.js",
    cdn: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
    note: "Best for 3D games, first-person, third-person, 3D racing, voxel worlds.",
  },
  kaboom: {
    name: "Kaboom.js",
    cdn: "https://unpkg.com/kaboom@3000.1.17/dist/kaboom.js",
    note: "Best for simple 2D games, game jams, retro pixel art, quick prototypes.",
  },
};

function detectEngine(prompt: string): string {
  const lower = prompt.toLowerCase();
  const is3D = /\b(3d|first.person|third.person|fps|tps|voxel|3d racing|3d world|openworld|open.world|terrain|skybox)\b/.test(lower);
  if (is3D) return "threejs";
  const isSimple = /\b(simple|retro|pixel|8.bit|game.jam|quick|tiny|mini)\b/.test(lower);
  if (isSimple) return "kaboom";
  return "phaser";
}

function buildSystemPrompt(engine: string, mode: "create" | "patch", existingCode?: string): string {
  const eng = ENGINE_MAP[engine];
  const base = `You are Eternity Game Studio's AI game generator. You produce a SINGLE, self-contained HTML file that runs a complete playable game using ${eng.name} loaded from CDN.

CRITICAL RULES:
1. Output ONLY the HTML code. No markdown, no explanation, no backticks, no code fences.
2. The HTML must include <script src="${eng.cdn}"></script>
3. The game must be fully playable with keyboard controls (arrow keys + space/enter).
4. Include a visible HUD showing score, health, or relevant stats.
5. The game must fit any screen size (responsive).
6. Use procedural graphics (shapes, text) — no external image assets.
7. Include: player movement, objective, lose condition, restart mechanism.
8. Add visual juice: particles, screen shake, glow effects where appropriate.
9. Dark background (#0a0a1a or similar).
10. Include a title screen with game name and "Press SPACE to start".
11. The game MUST be fun and polished — not a bare tech demo.
12. Use neon/retro aesthetic with glowing colours.

ENGINE: ${eng.name} — ${eng.note}

The entire output must be a valid HTML document starting with <!DOCTYPE html> and nothing else before or after.`;

  if (mode === "patch" && existingCode) {
    return `${base}

INCREMENTAL PATCH MODE:
The user already has a working game. They want to modify it. You MUST:
1. Take the existing code below and modify ONLY the parts needed to fulfil the new instruction.
2. Keep all existing mechanics, visuals, and logic that are not related to the change.
3. Output the COMPLETE modified HTML file (not a diff).
4. Preserve the game's title, existing features, and structure.

EXISTING GAME CODE:
\`\`\`html
${existingCode}
\`\`\``;
  }

  return base;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, messages, mode, existingCode, engine: requestedEngine } = body;

    if (!prompt && (!messages || messages.length === 0)) {
      return new Response(JSON.stringify({ error: "prompt or messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auto-detect or use requested engine
    const detectionSource = prompt || messages?.[messages.length - 1]?.content || "";
    const engine = requestedEngine || detectEngine(detectionSource);
    const genMode = mode === "patch" && existingCode ? "patch" : "create";
    const systemPrompt = buildSystemPrompt(engine, genMode, existingCode);

    // Build messages array for multi-turn
    let chatMessages: Array<{ role: string; content: string }>;
    if (messages && messages.length > 0) {
      chatMessages = [{ role: "system", content: systemPrompt }, ...messages];
    } else {
      chatMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create this game: ${prompt}` },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepend engine info as a custom SSE event
    const engineInfo = JSON.stringify({ engine, engineName: ENGINE_MAP[engine].name });
    const engineEvent = `data: {"custom":"engine_info","engine":"${engine}","engineName":"${ENGINE_MAP[engine].name}"}\n\n`;

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Write engine info then pipe AI stream
    (async () => {
      await writer.write(encoder.encode(engineEvent));
      const reader = response.body!.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
      await writer.close();
    })();

    return new Response(readable, {
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
