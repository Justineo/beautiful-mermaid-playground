import { renderMermaidASCII, renderMermaidSVG } from "beautiful-mermaid";
import { render } from "pele";
import type { Plugin } from "vite";
import { OFFICIAL_SAMPLES } from "../src/data/officialSamples.ts";
import { PELE_SAMPLES } from "../src/data/peleSamples.ts";
import {
  formatBeautifulMermaidError,
  getBeautifulMermaidHeaderReason,
} from "../src/utils/beautifulMermaidCompatibility.ts";

const SAMPLE_COMPATIBILITY_MODULE = "virtual:sample-compatibility";
const RESOLVED_MODULE = `\0${SAMPLE_COMPATIBILITY_MODULE}`;

function collectFailures(
  renderSample: (source: string) => unknown,
  engine: "Beautiful Mermaid" | "Pele",
): Record<string, string> {
  const failures: Record<string, string> = {};

  for (const { id, source } of [...OFFICIAL_SAMPLES, ...PELE_SAMPLES]) {
    try {
      renderSample(source);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (engine === "Beautiful Mermaid") {
        failures[id] = formatBeautifulMermaidError(
          message,
          getBeautifulMermaidHeaderReason(source),
        );
      } else if (message.includes("got 'ONLY_ONE'") && /:\s*one-to-one\s*$/mu.test(source)) {
        failures[id] = 'Pele requires quotes around the ER relationship label "one-to-one".';
      } else {
        failures[id] = `Pele: ${message.trim().split("\n", 1)[0]}`;
      }
    }
  }

  return failures;
}

export function sampleCompatibilityPlugin(): Plugin {
  return {
    name: "sample-compatibility",
    resolveId(id) {
      if (id === SAMPLE_COMPATIBILITY_MODULE) return RESOLVED_MODULE;
    },
    load(id) {
      if (id !== RESOLVED_MODULE) return;

      // Check the bundled examples with the installed engines outside the browser.
      const failures = {
        "beautiful-mermaid": collectFailures(renderMermaidSVG, "Beautiful Mermaid"),
        pele: collectFailures(
          (source) =>
            render(source, {
              links: false,
              images: false,
              autoDirection: false,
              responsive: false,
            }),
          "Pele",
        ),
        unicode: collectFailures(
          (source) => renderMermaidASCII(source, { colorMode: "html" }),
          "Beautiful Mermaid",
        ),
        ascii: collectFailures(
          (source) => renderMermaidASCII(source, { colorMode: "html", useAscii: true }),
          "Beautiful Mermaid",
        ),
      };
      return `export default ${JSON.stringify(failures)};`;
    },
  };
}
