import type { RegexEngine } from "@shikijs/core";

const REGEX_PATTERN_KEYS = new Set(["match", "begin", "end", "while"]);
let useOniguruma = false;
let enginePromise: Promise<RegexEngine> | null = null;
let patternPromise: Promise<(string | RegExp)[]> | null = null;

async function loadJavaScriptEngine(): Promise<RegexEngine> {
  const { createJavaScriptRegexEngine } = await import("@shikijs/engine-javascript");
  return createJavaScriptRegexEngine();
}

async function loadOnigurumaEngine(): Promise<RegexEngine> {
  const [{ createOnigurumaEngine }, { default: onigWasmUrl }] = await Promise.all([
    import("shiki/engine/oniguruma"),
    import("shiki/onig.wasm?url"),
  ]);

  return createOnigurumaEngine(async () => fetch(onigWasmUrl));
}

function patternId(value: string | RegExp): string {
  return typeof value === "string" ? `str:${value}` : `re:${value.source}/${value.flags}`;
}

function collectRegexPatterns(
  value: unknown,
  patterns: Map<string, string | RegExp>,
  seen: WeakSet<object>,
): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectRegexPatterns(entry, patterns, seen);
    }
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (REGEX_PATTERN_KEYS.has(key) && (typeof entry === "string" || entry instanceof RegExp)) {
      patterns.set(patternId(entry), entry);
      continue;
    }

    if (entry && typeof entry === "object") {
      collectRegexPatterns(entry, patterns, seen);
    }
  }
}

async function loadMermaidRegexPatterns(): Promise<(string | RegExp)[]> {
  if (patternPromise) {
    return patternPromise;
  }

  patternPromise = (async () => {
    const { default: mermaidLanguages } = await import("@shikijs/langs/mermaid");
    const [mermaidLanguage] = mermaidLanguages;
    if (!mermaidLanguage) {
      return [];
    }

    const patterns = new Map<string, string | RegExp>();
    collectRegexPatterns(mermaidLanguage, patterns, new WeakSet<object>());
    return [...patterns.values()];
  })();

  return patternPromise;
}

async function validateMermaidRegex(engine: RegexEngine): Promise<void> {
  const patterns = await loadMermaidRegexPatterns();
  if (patterns.length > 0) {
    // createScanner compiles all regex patterns; unsupported syntax throws here.
    engine.createScanner(patterns);
  }
}

async function loadShikiEngine(): Promise<RegexEngine> {
  if (useOniguruma) {
    return loadOnigurumaEngine();
  }

  try {
    const engine = await loadJavaScriptEngine();
    await validateMermaidRegex(engine);
    return engine;
  } catch {
    useOniguruma = true;
    return loadOnigurumaEngine();
  }
}

export function preloadShikiEngine(): Promise<RegexEngine> {
  if (enginePromise) {
    return enginePromise;
  }

  enginePromise = loadShikiEngine().catch((error) => {
    enginePromise = null;
    throw error;
  });

  return enginePromise;
}
