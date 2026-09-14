export function onRequestGet({ env }) {
  return json({ configured: Boolean(env.OPENAI_API_KEY) });
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    }
  });
}
