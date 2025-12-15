import { corsHeaders } from "../../_shared/cors.ts";

export interface ToolErrorDetails {
  code: string;
  message: string;
  toolName: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ToolErrorResponse {
  success: false;
  tool: string;
  error: ToolErrorDetails;
}

export function createToolErrorResponse(
  toolName: string,
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): Response {
  const responseBody: ToolErrorResponse = {
    success: false,
    tool: toolName,
    error: {
      code,
      message,
      toolName,
      retryable,
      details
    }
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200, // Always 200 for tool errors
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
