import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");
const NPM_REGISTRY_URL = "https://registry.npmjs.org/beautiful-mermaid/latest";
const OUTPUT_PATH = process.env.GITHUB_OUTPUT;

function normalizeVersion(version: string): string {
  return version.trim().replace(/^[~^]/u, "");
}

async function writeOutput(name: string, value: string): Promise<void> {
  if (!OUTPUT_PATH) {
    return;
  }

  await appendFile(OUTPUT_PATH, `${name}=${value}\n`, "utf8");
}

async function getCurrentVersion(): Promise<string> {
  const packageJsonRaw = await readFile(PACKAGE_JSON_PATH, "utf8");
  const packageJson = JSON.parse(packageJsonRaw) as {
    dependencies?: Record<string, string>;
  };

  const version = packageJson.dependencies?.["beautiful-mermaid"];
  if (!version) {
    throw new Error("Cannot find `beautiful-mermaid` in package.json dependencies.");
  }

  return normalizeVersion(version);
}

async function getLatestVersion(): Promise<string> {
  const response = await fetch(NPM_REGISTRY_URL, {
    headers: {
      "user-agent": "beautiful-mermaid-playground-version-check",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch npm metadata: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { version?: string };
  if (!payload.version) {
    throw new Error("npm metadata did not include a version.");
  }

  return normalizeVersion(payload.version);
}

async function main(): Promise<void> {
  const currentVersion = await getCurrentVersion();
  const latestVersion = await getLatestVersion();
  const shouldUpdate = currentVersion !== latestVersion;

  await writeOutput("current_version", currentVersion);
  await writeOutput("latest_version", latestVersion);
  await writeOutput("should_update", shouldUpdate ? "true" : "false");

  if (shouldUpdate) {
    console.log(`beautiful-mermaid will update from ${currentVersion} to ${latestVersion}`);
    return;
  }

  console.log(`beautiful-mermaid is already at ${currentVersion}`);
}

await main();
