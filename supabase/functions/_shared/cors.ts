const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    ALLOWED.includes('*') || !origin ? (ALLOWED.includes('*') ? '*' : ALLOWED[0]) : ALLOWED.includes(origin) ? origin : ALLOWED[0]
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'origin',
  }
}

export function preflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

export function jsonError(request: Request, status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(request.headers.get('origin')), 'content-type': 'application/json' },
  })
}
