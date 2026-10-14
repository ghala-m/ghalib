declare module "utif" {
  type Page = { width: number; height: number };
  const UTIF: { decode(buffer: ArrayBuffer): Page[]; decodeImage(buffer: ArrayBuffer, page: Page): void; toRGBA8(page: Page): Uint8Array };
  export default UTIF;
}