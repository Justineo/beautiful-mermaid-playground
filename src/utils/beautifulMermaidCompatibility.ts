export function getBeautifulMermaidHeaderReason(source: string): string {
  const header = source
    .split(/[\n;]/u)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("%%"));
  if (header === "---") {
    return "Beautiful Mermaid does not support YAML frontmatter.";
  }
  const diagramType = header?.split(/\s+/u, 1)[0];
  return diagramType
    ? `Beautiful Mermaid does not recognize the "${diagramType}" diagram header.`
    : "Beautiful Mermaid could not find a diagram header.";
}

export function formatBeautifulMermaidError(message: string, headerReason?: string): string {
  if (headerReason && message.startsWith("Invalid mermaid header:")) {
    return headerReason;
  }
  return `Beautiful Mermaid: ${message.trim().split("\n", 1)[0]}`;
}
