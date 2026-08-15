import type { AgentEvent } from '../../_shared/types.ts'
import { corsHeaders } from '../../_shared/cors.ts'

/**
 * Server-sent events, one JSON object per frame. The controller owns the socket
 * lifetime: the loop only calls `emit`, and a client disconnect surfaces as a
 * closed flag rather than an exception mid-reading.
 */
export class StreamController {
  private encoder = new TextEncoder()
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null
  private closed = false

  readonly body: ReadableStream<Uint8Array>

  constructor() {
    this.body = new ReadableStream({
      start: (controller) => {
        this.controller = controller
      },
      cancel: () => {
        this.closed = true
      },
    })
  }

  get aborted(): boolean {
    return this.closed
  }

  emit(event: AgentEvent): void {
    if (this.closed || !this.controller) return
    try {
      this.controller.enqueue(this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
    } catch {
      this.closed = true
    }
  }

  close(): void {
    if (this.closed || !this.controller) return
    this.closed = true
    try {
      this.controller.close()
    } catch {
      // Already torn down by the client.
    }
  }

  response(request: Request): Response {
    return new Response(this.body, {
      headers: {
        ...corsHeaders(request.headers.get('origin')),
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      },
    })
  }
}
