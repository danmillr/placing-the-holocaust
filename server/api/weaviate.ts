import {
  defineEventHandler,
  getMethod,
  readBody,
  setHeader,
  setResponseStatus
} from 'h3';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  setHeader(event, 'Access-Control-Allow-Origin', process.env.CORS_ALLOW_ORIGIN || '*');
  setHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS');
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    setResponseStatus(event, 204);
    return '';
  }
  if (method !== 'POST') {
    setResponseStatus(event, 405);
    return { error: 'Use POST /api/weaviate' };
  }

  const body = await readBody(event);
  const r = await fetch(process.env.WEAVIATE_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WEAVIATE_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
});
