# Beautiful Mermaid Playground

A minimal live playground for Mermaid diagrams, built with Vue 3.6 + Vite 8.

## Run

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm lint
pnpm type-check
pnpm build
pnpm preview
```

## Build notes

- Theme tokens are generated before `dev`, `type-check`, and `build` via
  `scripts/generate-beautiful-themes.mjs`.
- Vite chunk warnings are tuned to `1500kB` because Monaco and diagram runtime
  are intentionally split into dedicated async chunks.

## Acknowledgements

- [Mermaid](https://github.com/mermaid-js/mermaid)
- [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid)
