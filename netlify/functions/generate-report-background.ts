import type { Handler } from '@netlify/functions';
import { runGenerationPipeline } from '../../src/lib/pipeline';
import { safeEqual } from '../../src/lib/security/tokens';

// Only used if the app is hosted on Netlify. Production is on Vercel, where
// /api/submit runs the pipeline itself via after(). See docs/ARCHITECTURE-NOW.md.
//
// Callers must send the shared secret in the x-background-secret header. If
// BACKGROUND_FUNCTION_SECRET isn't configured, every call is refused (fail closed).
// The pipeline itself is idempotent: a submission that isn't PENDING is skipped.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const expected = process.env.BACKGROUND_FUNCTION_SECRET;
  const provided = event.headers['x-background-secret'] ?? '';
  if (!expected || !safeEqual(provided, expected)) {
    return { statusCode: 401, body: 'Unauthorised' };
  }

  let submissionId: string;
  try {
    const body = JSON.parse(event.body ?? '{}') as { submissionId?: string };
    if (!body.submissionId) {
      return { statusCode: 400, body: 'Missing submissionId' };
    }
    submissionId = body.submissionId;
  } catch {
    return { statusCode: 400, body: 'Invalid JSON body' };
  }

  try {
    await runGenerationPipeline(submissionId);
  } catch (err) {
    // Pipeline already sets status=FAILED in the DB before re-throwing.
    // Log the error here for Netlify function logs.
    console.error('[generate-report-background] Pipeline error:', err);
  }

  return { statusCode: 200, body: 'OK' };
};
