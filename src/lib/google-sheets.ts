import { google } from 'googleapis';

const SHEET_TAB = 'API Usage';

function makeAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export interface UsageLogRow {
  timestamp: string;
  submissionId: string;
  firmName: string;
  workEmail: string;
  modelUsed: string;
  requestId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  generationTimeMs: number;
  clearTrustScore: number;
  scoreBand: string;
}

export async function appendUsageRow(row: UsageLogRow): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const auth = makeAuth();

  if (!sheetId || !auth) {
    console.log('[google-sheets] Skipping: GOOGLE_SHEET_ID or service account credentials not set');
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB}!A:M`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          row.timestamp,
          row.submissionId,
          row.firmName,
          row.workEmail,
          row.modelUsed,
          row.requestId,
          row.inputTokens,
          row.outputTokens,
          row.totalTokens,
          row.estimatedCostUsd.toFixed(6),
          row.generationTimeMs,
          row.clearTrustScore,
          row.scoreBand,
        ]],
      },
    });
    console.log(`[google-sheets] Logged usage for submission ${row.submissionId} cost=$${row.estimatedCostUsd.toFixed(6)}`);
  } catch (err) {
    console.error('[google-sheets] Failed to append row:', err);
  }
}
