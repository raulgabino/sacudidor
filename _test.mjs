// Prueba local con fetch simulado (no usa internet ni claves reales).
import critique from "./api/critique.js";
import synthesize from "./api/synthesize.js";

// Claves falsas para pasar la validación de "falta key"
process.env.ANTHROPIC_API_KEY = "test";
process.env.OPENAI_API_KEY = "test";
process.env.DEEPSEEK_API_KEY = "test";
process.env.ACCESS_CODE = "clave123";

// fetch simulado: responde según el dominio
global.fetch = async (url) => {
  if (url.includes("anthropic.com")) {
    return { ok: true, json: async () => ({ content: [{ text: "Crítica de Anthropic OK" }] }) };
  }
  if (url.includes("deepseek.com")) {
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Crítica de DeepSeek OK" } }] }) };
  }
  if (url.includes("openai.com")) {
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Crítica de GPT OK" } }] }) };
  }
  return { ok: false, status: 404, json: async () => ({ error: { message: "url desconocida" } }) };
};

function mockRes() {
  return {
    _status: null, _json: null,
    status(s) { this._status = s; return this; },
    json(j) { this._json = j; return this; },
  };
}
function mockReq(body) { return { method: "POST", body }; }

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  ok  -", name); }
  else { fail++; console.log("  FAIL-", name); }
}

// 1) Cada modelo devuelve texto
for (const model of ["claude", "deepseek", "gpt"]) {
  const res = mockRes();
  await critique(mockReq({ hypothesis: "Hipótesis de prueba", model, accessCode: "clave123" }), res);
  check(`critique/${model} responde 200 con texto`, res._status === 200 && typeof res._json.text === "string" && res._json.text.length > 0);
}

// 2) Código de acceso incorrecto se rechaza
{
  const res = mockRes();
  await critique(mockReq({ hypothesis: "x", model: "claude", accessCode: "malo" }), res);
  check("critique rechaza código incorrecto", res._json.error && res._json.error.includes("Código"));
}

// 3) Modelo inválido
{
  const res = mockRes();
  await critique(mockReq({ hypothesis: "x", model: "otro", accessCode: "clave123" }), res);
  check("critique rechaza modelo desconocido", !!res._json.error);
}

// 4) Síntesis con Opus
{
  const res = mockRes();
  await synthesize(mockReq({
    hypothesis: "Hipótesis de prueba",
    responses: { claude: "a", deepseek: "b", gpt: "c" },
    accessCode: "clave123",
  }), res);
  check("synthesize responde 200 con texto", res._status === 200 && typeof res._json.text === "string" && res._json.text.length > 0);
}

// 5) Maneja error de API (status no-ok) sin tronar
{
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: "clave inválida" } }) });
  const res = mockRes();
  await critique(mockReq({ hypothesis: "x", model: "claude", accessCode: "clave123" }), res);
  check("critique captura error de API y lo devuelve", res._status === 200 && res._json.error && res._json.error.includes("clave inválida"));
}

console.log(`\nResultado: ${pass} ok, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
