/**
 * Food Resolver Metrics Endpoint
 * 
 * Provides Prometheus-style metrics for the food resolver system.
 * Aggregates data from food_search_logs table.
 * 
 * Endpoint: /metrics/food_resolver
 * Access: Public (read-only)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSearchAPI } from "../_shared/security/applyMiddleware.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MetricsResponse {
  timestamp: string;
  total_queries: number;
  avg_latency_ms: number;
  error_rate: number;
  cache_hit_rate: number;
  queries_last_hour: number;
  queries_last_day: number;
  top_queries: Array<{ query: string; count: number }>;
  latency_percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

Deno.const handler = async (req) => {
  try {
    // CORS headers
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only allow GET requests
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get total queries
    const { count: totalQueries, error: countError } = await supabase
      .from("food_search_logs")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw new Error(`Failed to get total queries: ${countError.message}`);
    }

    // Get average latency
    const { data: avgData, error: avgError } = await supabase
      .rpc("get_avg_latency");

    const avgLatency = avgData?.[0]?.avg || 0;

    // Get error rate (queries with success = false)
    const { count: errorCount, error: errorCountError } = await supabase
      .from("food_search_logs")
      .select("*", { count: "exact", head: true })
      .eq("success", false);

    if (errorCountError) {
      throw new Error(`Failed to get error count: ${errorCountError.message}`);
    }

    const errorRate = totalQueries > 0 ? errorCount / totalQueries : 0;

    // Get cache hit rate (queries with result_count > 0)
    const { count: hitCount, error: hitCountError } = await supabase
      .from("food_search_logs")
      .select("*", { count: "exact", head: true })
      .gt("result_count", 0);

    if (hitCountError) {
      throw new Error(`Failed to get hit count: ${hitCountError.message}`);
    }

    const cacheHitRate = totalQueries > 0 ? hitCount / totalQueries : 0;

    // Get queries in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: queriesLastHour, error: hourError } = await supabase
      .from("food_search_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    if (hourError) {
      throw new Error(`Failed to get queries last hour: ${hourError.message}`);
    }

    // Get queries in last day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: queriesLastDay, error: dayError } = await supabase
      .from("food_search_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo);

    if (dayError) {
      throw new Error(`Failed to get queries last day: ${dayError.message}`);
    }

    // Get top queries
    const { data: topQueriesData, error: topQueriesError } = await supabase
      .from("food_search_logs")
      .select("query")
      .limit(1000);

    if (topQueriesError) {
      throw new Error(`Failed to get top queries: ${topQueriesError.message}`);
    }

    // Count query frequencies
    const queryFreq = new Map<string, number>();
    for (const row of topQueriesData || []) {
      queryFreq.set(row.query, (queryFreq.get(row.query) || 0) + 1);
    }

    const topQueries = Array.from(queryFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Get latency percentiles
    const { data: latencyData, error: latencyError } = await supabase
      .from("food_search_logs")
      .select("latency_ms")
      .order("latency_ms", { ascending: true });

    if (latencyError) {
      throw new Error(`Failed to get latency data: ${latencyError.message}`);
    }

    const latencies = (latencyData || []).map((row) => row.latency_ms);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    // Build response
    const metrics: MetricsResponse = {
      timestamp: new Date().toISOString(),
      total_queries: totalQueries || 0,
      avg_latency_ms: parseFloat(avgLatency.toFixed(2)),
      error_rate: parseFloat(errorRate.toFixed(4)),
      cache_hit_rate: parseFloat(cacheHitRate.toFixed(4)),
      queries_last_hour: queriesLastHour || 0,
      queries_last_day: queriesLastDay || 0,
      top_queries: topQueries,
      latency_percentiles: {
        p50: parseFloat(p50.toFixed(2)),
        p95: parseFloat(p95.toFixed(2)),
        p99: parseFloat(p99.toFixed(2)),
      },
    };

    return new Response(JSON.stringify(metrics, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in metrics_food_resolver:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withSearchAPI(handler));

