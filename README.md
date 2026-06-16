# Sacudidor de Hipótesis

Herramienta para clase: el estudiante da una hipótesis, tú la pones en un cuadro, le das **Sacudir** y tres modelos de IA (Claude Sonnet 4.6, DeepSeek V4 y GPT-5.4 mini) la critican en paralelo. Luego el botón **Comparar respuestas** usa **Claude Opus 4.8** para resumir en qué coinciden y en qué chocan.

Pensada para usarse desde un proyector, operada por ti.

---

## Qué necesitas (3 cosas)

1. **Tres API keys** (las consigues una vez):
   - Anthropic (Claude + Opus): https://console.anthropic.com → API Keys
   - OpenAI (GPT-5.4 mini): https://platform.openai.com → API keys
   - DeepSeek: https://platform.deepseek.com → API keys
   > En las tres tendrás que cargar un poco de saldo. Para 10 usos el gasto es de centavos (menos de 1 USD).

2. **Una cuenta de Vercel** (gratis): https://vercel.com (puedes entrar con tu correo o con GitHub).

3. **Un código de acceso** que tú inventes (ej. `clase2026`). Sirve para que nadie más use tu app y te gaste saldo. Es opcional pero recomendado.

---

## Cómo subirlo a Vercel

### Opción A — Con la terminal (la más rápida)

1. Instala Node.js si no lo tienes: https://nodejs.org (versión LTS).
2. Abre la terminal **dentro de la carpeta `sacudidor`** y ejecuta:
   ```
   npm install -g vercel
   vercel login
   vercel
   ```
   Acepta las preguntas con Enter. Al terminar te dará una URL (ej. `sacudidor-xxxx.vercel.app`).
3. Carga las claves (pega cada una cuando te la pida):
   ```
   vercel env add ANTHROPIC_API_KEY
   vercel env add OPENAI_API_KEY
   vercel env add DEEPSEEK_API_KEY
   vercel env add ACCESS_CODE
   ```
   (En cada una elige los tres entornos: Production, Preview, Development.)
4. Publica la versión final con las claves ya cargadas:
   ```
   vercel --prod
   ```
   Listo: abre la URL `…vercel.app` en el proyector.

### Opción B — Sin terminal (todo en el navegador)

1. Crea una cuenta en https://github.com y un repositorio nuevo.
2. Sube ahí todos los archivos de la carpeta `sacudidor` (botón **Add file → Upload files**).
3. Entra a https://vercel.com → **Add New → Project** → importa ese repositorio → **Deploy**.
4. En el proyecto, ve a **Settings → Environment Variables** y agrega una por una:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `DEEPSEEK_API_KEY`
   - `ACCESS_CODE` (tu código inventado)
5. Ve a **Deployments → … → Redeploy** para que tome las claves. Abre la URL y a usar.

---

## Cómo usarla en clase

1. Abre la URL en el proyector.
2. Escribe tu código de acceso una vez (arriba a la derecha).
3. Pega la hipótesis del estudiante en el cuadro.
4. Pulsa **⚡ Sacudir** (o `Ctrl/Cmd + Enter`). Las tres columnas se llenan a su propia velocidad.
5. Cuando quieras, pulsa **Comparar respuestas** para ver la síntesis de Opus 4.8.

---

## Ajustes rápidos

- **Cambiar el nombre de un modelo:** edita el objeto `MODELS` arriba en `api/critique.js`. El modelo de la síntesis está en `SYNTH_MODEL` dentro de `api/synthesize.js`.
- **Cambiar el tono de la crítica:** edita el texto `SYSTEM_PROMPT` en `api/critique.js`.
- **Quitar el código de acceso:** no definas la variable `ACCESS_CODE` en Vercel.

## Notas

- Las claves viven solo en el servidor de Vercel; nunca se exponen en el navegador.
- DeepSeek y OpenAI son compatibles entre sí, por eso comparten el mismo código de llamada.
- El nombre del modelo de DeepSeek (`deepseek-v4-flash`) o de GPT (`gpt-5.4-mini`) puede cambiar con el tiempo; si una llamada falla con "model not found", actualiza el nombre en `api/critique.js`.
- GPT-5.4 mini y DeepSeek V4 son modelos de "razonamiento": pueden tardar unos segundos más que Claude. Es normal y de paso se nota en clase que cada modelo piensa distinto.
- Precios oficiales (jun 2026, por millón de tokens entrada/salida): Sonnet 4.6 $3 / $15 · GPT-5.4 mini $0.75 / $4.50 · DeepSeek V4 Flash $0.14 / $0.28 · Opus 4.8 $5 / $25.
