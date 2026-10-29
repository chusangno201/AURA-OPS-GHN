import { google } from "googleapis";

export async function checkSku(input: string) {
  const sku = input.trim().toUpperCase();

  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_SHEET_ID,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET ||
      !GOOGLE_REFRESH_TOKEN || !GOOGLE_SHEET_ID) {
    throw new Error("Thiếu cấu hình Google Sheets OAuth");
  }

  const auth = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

  const sheets = google.sheets({ version: "v4", auth });

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "'ALL SẢN PHẨM - MÃ SKU'!B2:B",
  });

  const codes = (result.data.values || [])
    .map(row => String(row[0] || "").trim().toUpperCase())
    .filter(code => /^AURA-[A-Z0-9-]+$/.test(code));

  return codes.includes(sku);
}
