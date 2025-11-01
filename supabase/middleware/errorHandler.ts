// Error handling middleware for Edge Functions

export interface ErrorResponse {
  error: string;
  details?: any;
  timestamp: string;
}

export function handleError(error: unknown): Response {
  console.error('Error:', error);
  
  const errorResponse: ErrorResponse = {
    error: error instanceof Error ? error.message : 'An unknown error occurred',
    details: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify(errorResponse),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export function createErrorResponse(message: string, status: number = 400): Response {
  const errorResponse: ErrorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify(errorResponse),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

