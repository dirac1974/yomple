// field-voice-build — one-time generator for the Quiet Field "imagined Lincoln" voice.
// Never called by the app. Each call does ONE step so it stays inside edge time limits.
// Secret: ELEVENLABS_API_KEY (entered by the parent in the Supabase dashboard).
// Caller must send x-admin whose SHA-256 matches ADMIN_SHA256 (token kept off-repo).
// Output: public bucket `field-audio`, immutable paths under gettysburg/<voice>/<take>/.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const EL = "https://api.elevenlabs.io";
const BUCKET = "field-audio";
const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function el(path: string, body: unknown) {
  const r = await fetch(EL + path, {
    method: "POST",
    headers: { "xi-api-key": Deno.env.get("ELEVENLABS_API_KEY") ?? "", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const ADMIN_SHA256 = "f9496ca9032c583035f206b386f1b5d9855f1d9ab79869f3f5fd523c7e568ebb";
async function sha256(t: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const safe = (s: string) => /^[a-z0-9][a-z0-9_\-\/\.]{0,120}$/i.test(s) && !s.includes("..");

Deno.serve(async (req) => {
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  if ((await sha256(req.headers.get("x-admin") ?? "")) !== ADMIN_SHA256) return j({ error: "forbidden" }, 403);
  if (!Deno.env.get("ELEVENLABS_API_KEY")) return j({ error: "ELEVENLABS_API_KEY secret is not set" }, 412);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const put = async (path: string, data: Uint8Array | string, type: string) => {
    const { error } = await sb.storage.from(BUCKET).upload(path, data, { contentType: type, upsert: true });
    if (error) throw new Error("storage: " + error.message);
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  try {
    const q = await req.json();
    const out: string = q.out ?? "";
    if (out && !safe(out)) return j({ error: "bad out path" }, 400);

    // 1) Voice design previews: {action:'design', description, text, model_id, seed, guidance_scale, out}
    if (q.action === "design") {
      const r = await el("/v1/text-to-voice/design", {
        voice_description: q.description,
        text: q.text,
        model_id: q.model_id ?? "eleven_multilingual_ttv_v2",
        seed: q.seed ?? 7,
        guidance_scale: q.guidance_scale ?? 5,
        should_enhance: false,
      });
      const previews = [];
      for (const [k, p] of (r.previews ?? []).entries()) {
        const url = await put(`${out}/preview-${k}.mp3`, b64ToBytes(p.audio_base_64 ?? p.audio_base64), "audio/mpeg");
        previews.push({ generated_voice_id: p.generated_voice_id, url });
      }
      return j({ previews });
    }

    // 2) Save a chosen preview as a voice: {action:'save', generated_voice_id, name, description}
    if (q.action === "save") {
      const r = await el("/v1/text-to-voice", {
        voice_name: q.name ?? "Quiet Field imagined voice",
        voice_description: q.description ?? "Imagined 1860s orator (family learning game, labelled as computer-made).",
        generated_voice_id: q.generated_voice_id,
      });
      return j({ voice_id: r.voice_id });
    }

    // 3) One take with timestamps: {action:'tts', voice_id, text, model_id, seed, speed, stability, out}
    if (q.action === "tts") {
      if (!/^[A-Za-z0-9]{8,40}$/.test(q.voice_id ?? "")) return j({ error: "bad voice_id" }, 400);
      const r = await el(`/v1/text-to-speech/${q.voice_id}/with-timestamps?output_format=mp3_44100_128`, {
        text: q.text,
        model_id: q.model_id ?? "eleven_multilingual_v2",
        seed: q.seed ?? 1863,
        previous_text: q.previous_text,
        next_text: q.next_text,
        voice_settings: {
          stability: q.stability ?? 0.6,
          similarity_boost: 0.8,
          style: q.style ?? 0.05,
          use_speaker_boost: true,
          speed: q.speed ?? 0.9,
        },
      });
      const audio = await put(`${out}/take.mp3`, b64ToBytes(r.audio_base64), "audio/mpeg");
      const align = await put(
        `${out}/alignment.json`,
        JSON.stringify({ alignment: r.alignment, normalized_alignment: r.normalized_alignment, text: q.text }),
        "application/json",
      );
      return j({ audio, align });
    }

    return j({ error: "unknown action" }, 400);
  } catch (e) {
    return j({ error: String((e as Error).message ?? e) }, 502);
  }
});
