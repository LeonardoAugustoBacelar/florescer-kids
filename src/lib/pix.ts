import QRCode from "qrcode";

// Dados fixos do recebedor, exigidos pelo padrão do Banco Central (BR Code)
// para gerar um QR code PIX estático e válido.
export const PIX_CONFIG = {
  key: "11970406208",
  // Chave do tipo telefone precisa estar no formato E.164 (+55DDDNNNNNNNNN)
  keyFormatted: "+5511970406208",
  name: "Gilda Bacelar",
  // Campo "cidade" do BR Code exige texto em ASCII, sem acentuação.
  city: "Sao Paulo",
  // Valor de reserva, usado só quando não há preço de professora em tela.
  // O valor real vem sempre do perfil (`pricePerHour` /
  // `pricePerHourDomicilio`) e é passado pra `PixPaymentInfo` — senão o QR
  // cobraria um valor diferente do anunciado quando a professora muda o preço.
  amount: 60,
} as const;

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emvField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

/** Monta o payload "PIX copia e cola" (BR Code) para um QR estático com valor pré-definido. */
export function buildPixPayload(amount: number = PIX_CONFIG.amount): string {
  const merchantAccountInfo =
    emvField("00", "br.gov.bcb.pix") + emvField("01", PIX_CONFIG.keyFormatted);
  const additionalData = emvField("05", "***");

  const fieldsWithoutCrc =
    emvField("00", "01") + // Payload Format Indicator
    emvField("01", "11") + // Point of Initiation Method (estático, reutilizável)
    emvField("26", merchantAccountInfo) +
    emvField("52", "0000") + // Merchant Category Code
    emvField("53", "986") + // Moeda: Real (BRL)
    (amount > 0 ? emvField("54", amount.toFixed(2)) : "") + // Valor da transação
    emvField("58", "BR") +
    emvField("59", PIX_CONFIG.name.slice(0, 25)) +
    emvField("60", PIX_CONFIG.city.slice(0, 15)) +
    emvField("62", additionalData) +
    "6304"; // ID + tamanho do próprio CRC, antes de calculá-lo

  return fieldsWithoutCrc + crc16(fieldsWithoutCrc);
}

export async function getPixQrCodeDataUrl(
  amount: number = PIX_CONFIG.amount
): Promise<string> {
  return QRCode.toDataURL(buildPixPayload(amount), {
    margin: 1,
    width: 320,
    color: { dark: "#18181b", light: "#ffffff" },
  });
}
