/// <reference types="vite/client" />

declare module "virtual:sample-compatibility" {
  const failures: Record<
    import("./src/types/playground").PreviewTarget,
    Partial<Record<string, string>>
  >;
  export default failures;
}
