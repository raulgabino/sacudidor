// Función serverless: pide a UN modelo que "sacuda" la hipótesis.
// El frontend llama a este endpoint tres veces en paralelo (model=claude|deepseek|gpt).
// Las API keys viven SOLO aquí, en variables de entorno de Vercel. Nunca llegan al navegador.

// --- Nombres de modelo (cámbialos aquí si alguna API renombra su modelo) ---
const MODELS = {
  claude:   "claude-sonnet-4-6",
  deepseek: "deepseek-v4-flash",
  gpt:      "gpt-5.4-mini",
};

// El MISMO encargo para los tres, para que la diferencia se deba al modelo y no al prompt.
const SYSTEM_PROMPT = `Eres un crítico riguroso de hipótesis académicas. Un estudiante universitario propone una hipótesis y tu trabajo es "sacudirla".

Haz lo siguiente, de forma directa y concreta:
- Señala los supuestos ocultos y los términos ambiguos o mal definidos.
- Detecta posibles sesgos, confusiones causa-efecto o variables de confusión.
- Propón cómo se podría poner a prueba o falsar la hipótesis.

Responde en español en UN solo párrafo breve, de MÁXIMO 90 palabras (no te pases de 90). Ve directo a lo más importante: el supuesto o la falla principal, y una forma concreta de ponerla a prueba. Sé honesto y exigente pero constructivo; no repitas la hipótesis al inicio. Mantén tu propio estilo natural.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body = await readJson(req);
  const { hypothesis, model, accessCode } = body || {};

  if (process.env.ACCESS_CODE && accessCode !== process.env.ACCESS_CODE) {
    res.status(200).json({ error: "Código de acceso incorrecto." });
    return;
  }
  if (!hypothesis || !model || !MODELS[model]) {
    res.status(200).json({ error: "Faltan datos (hypothesis / model)." });
    return;
  }

  try {
    let text;
    if (model === "claude") {
      text = await callAnthropic(MODELS.claude, SYSTEM_PROMPT, hypothesis, 300);
    } else if (model === "deepseek") {
      text = await callOpenAICompatible(
        "https://api.deepseek.com/chat/completions",
        process.env.DEEPSEEK_API_KEY,
        "DEEPSEEK_API_KEY",
        MODELS.deepseek,
        SYSTEM_PROMPT,
        hypothesis,
        // DeepSeek V4 razona ("thinking") antes de responder y ese proceso consume
        // tokens; por eso necesita un tope amplio. El límite real de 90 palabras lo
        // marca el prompt, no este número.
        { temperature: 0.7, max_tokens: 2000 }
      );
    } else if (model === "gpt") {
      text = await callOpenAICompatible(
        "https://api.openai.com/v1/chat/completions",
        process.env.OPENAI_API_KEY,
        "OPENAI_API_KEY",
        MODELS.gpt,
        SYSTEM_PROMPT,
        hypothesis,
        // GPT-5.x es modelo de razonamiento: usa max_completion_tokens (no max_tokens),
        // temperature por defecto, y reasoning_effort para controlar velocidad/coste.
        { max_completion_tokens: 2000, reasoning_effort: "low" }
      );
    }
    res.status(200).json({ text: text || "(respuesta vacía)" });
  } catch (e) {
    res.status(200).json({ error: String(e && e.message ? e.message : e) });
  }
}

// ---------- Llamada a Anthropic (Claude / Opus) ----------
export async function callAnthropic(model, system, userText, maxTokens = 700) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Falta ANTHROPIC_API_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Anthropic error ${r.status}`);
  return (data.content || []).map((b) => b.text || "").join("").trim();
}

// ---------- Llamada compatible con OpenAI (sirve para OpenAI y DeepSeek) ----------
async function callOpenAICompatible(url, key, keyName, model, system, userText, extra) {
  if (!key) throw new Error(`Falta ${keyName}`);
  const messages = [
    { role: "system", content: system },
    { role: "user", content: userText },
  ];
  async function send(params) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, ...params }),
    });
    const data = await r.json();
    return { ok: r.ok, status: r.status, data };
  }
  let { ok, status, data } = await send(extra);
  // Si el modelo rechaza algún parámetro opcional (p. ej. reasoning_effort),
  // reintenta una vez sin él para no romper la demo.
  if (!ok && extra && extra.reasoning_effort) {
    const { reasoning_effort, ...rest } = extra;
    ({ ok, status, data } = await send(rest));
  }
  if (!ok) throw new Error(data?.error?.message || `Error ${status}`);
  return data?.choices?.[0]?.message?.content?.trim();
}

// ---------- Lee el body JSON de forma robusta ----------
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
