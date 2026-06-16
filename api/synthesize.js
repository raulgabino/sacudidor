// Función serverless: toma la hipótesis + las tres críticas y, con Claude Opus 4.8,
// resume EN QUÉ COINCIDEN y EN QUÉ CHOCAN los tres modelos.
// Se llama solo al pulsar "Comparar respuestas".

const SYNTH_MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `Eres un analista claro y conciso. Te doy una hipótesis de un estudiante y tres críticas hechas por tres modelos de IA distintos (Claude, DeepSeek y GPT).

Tu tarea: comparar las tres críticas. Responde en español, máximo ~160 palabras, con exactamente esta estructura:

Coinciden en: (qué observaciones comparten los tres)
Difieren en: (en qué se contradicen o qué ve uno que los otros no)

Sé concreto y útil para que el estudiante entienda por qué conviene contrastar varios modelos. No inventes acuerdos que no existan.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body = await readJson(req);
  const { hypothesis, responses, accessCode } = body || {};

  if (process.env.ACCESS_CODE && accessCode !== process.env.ACCESS_CODE) {
    res.status(200).json({ error: "Código de acceso incorrecto." });
    return;
  }
  if (!hypothesis || !responses) {
    res.status(200).json({ error: "Faltan datos para la síntesis." });
    return;
  }

  const userText =
    `Hipótesis del estudiante:\n${hypothesis}\n\n` +
    `Crítica de Claude Sonnet 4.6:\n${responses.claude || "(sin respuesta)"}\n\n` +
    `Crítica de DeepSeek V4:\n${responses.deepseek || "(sin respuesta)"}\n\n` +
    `Crítica de GPT-5.4 mini:\n${responses.gpt || "(sin respuesta)"}\n\n` +
    `Ahora compara las tres críticas.`;

  try {
    const text = await callAnthropic(SYNTH_MODEL, SYSTEM_PROMPT, userText, 600);
    res.status(200).json({ text: text || "(síntesis vacía)" });
  } catch (e) {
    res.status(200).json({ error: String(e && e.message ? e.message : e) });
  }
}

async function callAnthropic(model, system, userText, maxTokens) {
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
      temperature: 0.5,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Anthropic error ${r.status}`);
  return (data.content || []).map((b) => b.text || "").join("").trim();
}

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
