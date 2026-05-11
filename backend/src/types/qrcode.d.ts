declare module "qrcode" {
  type ToDataURLOptions = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  };

  export function toDataURL(text: string, options?: ToDataURLOptions): Promise<string>;
}
