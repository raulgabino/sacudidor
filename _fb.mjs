import critique from "./api/critique.js";
process.env.OPENAI_API_KEY = "test";
let calls = 0;
global.fetch = async (url, opts) => {
  if (url.includes("openai.com")) {
    calls++;
    const body = JSON.parse(opts.body);
    if (calls === 1) {
      if (!("reasoning_effort" in body)) throw new Error("primera deberia incluir reasoning_effort");
      return { ok:false, status:400, json: async()=>({error:{message:"Unsupported parameter: reasoning_effort"}}) };
    }
    if ("reasoning_effort" in body) throw new Error("reintento NO deberia incluir reasoning_effort");
    return { ok:true, json: async()=>({choices:[{message:{content:"GPT OK tras fallback"}}]}) };
  }
  return { ok:false, status:404, json: async()=>({error:{message:"x"}}) };
};
const res = { status(s){this._s=s;return this;}, json(j){this._j=j;return this;} };
await critique({ method:"POST", body:{ hypothesis:"h", model:"gpt" } }, res);
console.log("intentos a openai:", calls, "| resultado:", JSON.stringify(res._j));
process.exit(res._j.text === "GPT OK tras fallback" && calls === 2 ? 0 : 1);
