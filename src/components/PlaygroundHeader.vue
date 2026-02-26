<script setup lang="ts">
import { ExternalLink, Github, Twitter } from "lucide-vue-next";
</script>

<template>
  <header class="playground-header">
    <div class="brand-row">
      <div class="title-block">
        <h1>
          <span class="title-main">Beautiful Mermaid</span>
          <span class="title-tag">Playground</span>
        </h1>
      </div>

      <div class="toolbar-actions">
        <div class="action-group">
          <nav class="credit-links" aria-label="Links">
            <span class="credit-prefix">Made by</span>
            <a
              class="credit-link"
              href="https://x.com/_justineo"
              target="_blank"
              rel="noreferrer noopener"
              title="Justineo on X"
            >
              <span>Justineo</span>
              <Twitter class="external-icon" :size="10" :stroke-width="1.35" />
            </a>
            <span class="credit-separator" aria-hidden="true">&middot;</span>
            <a
              class="credit-link"
              href="https://github.com/Justineo/beautiful-mermaid-playground"
              target="_blank"
              rel="noreferrer noopener"
              title="GitHub repository"
            >
              <span>GitHub</span>
              <Github class="external-icon" :size="10" :stroke-width="1.35" />
            </a>
            <span class="credit-separator" aria-hidden="true">&middot;</span>
            <a
              class="credit-link"
              href="https://mermaid.ai/open-source/"
              target="_blank"
              rel="noreferrer noopener"
              title="Mermaid open source"
            >
              <span>Mermaid</span>
              <ExternalLink class="external-icon" :size="10" :stroke-width="1.35" />
            </a>
            <span class="credit-separator" aria-hidden="true">&middot;</span>
            <a
              class="credit-link"
              href="https://agents.craft.do/mermaid"
              target="_blank"
              rel="noreferrer noopener"
              title="Beautiful Mermaid project"
            >
              <span>Beautiful Mermaid</span>
              <ExternalLink class="external-icon" :size="10" :stroke-width="1.35" />
            </a>
          </nav>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.playground-header {
  display: grid;
  gap: 0;
  padding: 0.52rem 0.68rem 0.36rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 82%, transparent);
  background: var(--surface);
}

.brand-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.48rem;
  min-width: 0;
}

.title-block {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: var(--ui-control-height);
}

.playground-header h1 {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.02rem 0;
  font-family:
    "Geist",
    system-ui,
    -apple-system,
    sans-serif;
  font-size: var(--fs-title);
  font-weight: 560;
  line-height: var(--lh-tight);
  white-space: nowrap;
  letter-spacing: 0.002em;
}

.title-main {
  color: var(--text-primary);
  font-weight: 800;
}

.title-tag {
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: 300;
  line-height: inherit;
  letter-spacing: inherit;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.action-group {
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.credit-links {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  font-size: var(--fs-meta);
  color: var(--text-tertiary);
}

.credit-prefix {
  white-space: nowrap;
}

.credit-link {
  display: inline-flex;
  align-items: center;
  gap: 0.12rem;
  padding: 0;
  color: var(--text-secondary);
  white-space: nowrap;
  text-decoration: none;
  transition:
    color 120ms ease,
    text-decoration-color 120ms ease;
}

.external-icon {
  opacity: 0.82;
}

.credit-separator {
  color: var(--text-muted);
  line-height: 1;
}

.credit-link:hover {
  color: var(--text-primary);
  text-decoration: underline;
  text-underline-offset: 1.5px;
  text-decoration-color: color-mix(in srgb, var(--text-primary) 46%, transparent);
}
</style>
