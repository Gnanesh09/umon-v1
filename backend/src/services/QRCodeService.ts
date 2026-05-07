import QRCode from "qrcode";

export class QRCodeService {
  async generateSvg(url: string): Promise<string> {
    return QRCode.toString(url, { type: "svg" });
  }

  async generatePng(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, { type: "png", width: 400, margin: 2 });
  }
}
