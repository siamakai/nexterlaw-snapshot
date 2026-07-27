import type { Handler } from '@netlify/functions';
import { runGenerationPipeline } from '../../src/lib/pipeline';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
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
