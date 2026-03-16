declare module "apca-w3" {
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number;

  export function reverseAPCA(
    contrast: number,
    knownY: number,
    knownType?: "bg" | "background" | "txt" | "text",
    returnAs?: "hex" | "color" | "Y" | "y",
  ): string | [number, number, number, number, string] | number | false;

  export function sRGBtoY(
    rgb?: [number, number, number] | [number, number, number, number],
  ): number;
}
