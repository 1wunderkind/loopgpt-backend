import { SECURITY_HEADERS } from "./security/SecurityHeaders.ts";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, baggage, sentry-trace',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  ...SECURITY_HEADERS
};
