const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

/**
 * Trả đúng origin của người gọi khi nó nằm trong danh sách — trình duyệt từ chối
 * một danh sách nhiều origin trong `access-control-allow-origin`, nên phải chọn
 * một. Không khớp thì trả origin đầu tiên, coi như từ chối.
 */
function allowedOrigin(origin: string | null): string {
  if (ALLOWED.includes('*')) return '*'
  if (origin && ALLOWED.includes(origin)) return origin
  return ALLOWED[0] ?? '*'
}

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'access-control-allow-origin': allowedOrigin(origin),
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-max-age': '86400',
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
