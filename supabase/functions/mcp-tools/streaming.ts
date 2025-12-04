/**
 * Streaming helper for Server-Sent Events (SSE)
 * Allows progressive delivery of AI responses
 */

export class StreamingResponse {
  private encoder = new TextEncoder();
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  /**
   * Create a streaming response
   */
  createStream(): Response {
    const stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      }
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }
  
  /**
   * Send a progress event
   */
  sendProgress(message: string, progress: number) {
    if (!this.controller) return;
    
    const event = {
      type: "progress",
      message,
      progress, // 0-100
      timestamp: new Date().toISOString()
    };
    
    const data = `data: ${JSON.stringify(event)}\n\n`;
    this.controller.enqueue(this.encoder.encode(data));
  }
  
  /**
   * Send partial data
   */
  sendData(data: any) {
    if (!this.controller) return;
    
    const event = {
      type: "data",
      data,
      timestamp: new Date().toISOString()
    };
    
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    this.controller.enqueue(this.encoder.encode(eventData));
  }
  
  /**
   * Send final result and close stream
   */
  sendComplete(result: any) {
    if (!this.controller) return;
    
    const event = {
      type: "complete",
      result,
      timestamp: new Date().toISOString()
    };
    
    const data = `data: ${JSON.stringify(event)}\n\n`;
    this.controller.enqueue(this.encoder.encode(data));
    this.controller.close();
  }
  
  /**
   * Send error and close stream
   */
  sendError(error: string) {
    if (!this.controller) return;
    
    const event = {
      type: "error",
      error,
      timestamp: new Date().toISOString()
    };
    
    const data = `data: ${JSON.stringify(event)}\n\n`;
    this.controller.enqueue(this.encoder.encode(data));
    this.controller.close();
  }
}

/**
 * Helper to check if client wants streaming
 */
export function wantsStreaming(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}
