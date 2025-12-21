// Error handling middleware for Edge Functions

export interface ErrorResponse {
  error: string;
  details?: any;
  timestamp: string;
}

export function handleError(error: unknown): Response {
  console.error("Error:", error);

  const errorResponse: ErrorResponse = {
    error: error instanceof Error ? error.message : "An unknown error occurred",
    details: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify(errorResponse),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function createErrorResponse(
  code: string,
  details?: any,
  status: number = 400,
): Response {
  // Handle legacy calls where first arg is message and second is status
  if (typeof details === "number") {
    status = details;
    details = undefined;
  }

  const errorResponse: ErrorResponse = {
    error: code,
    details: details,
    timestamp: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify(errorResponse),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function createSuccessResponse(
  data: any,
  status: number = 200,
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function validateRequired(body: any, fields: string[]): string | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}
