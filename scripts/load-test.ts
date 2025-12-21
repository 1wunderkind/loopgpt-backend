import { sleep } from "https://deno.land/x/sleep/mod.ts";

// Config
const DURATION_SEC = 10; // Short duration for demo
const RPS_TARGET = 30;
const CONCURRENCY = 5;

async function simulateRequest(id: number) {
  const start = Date.now();
  // Simulate network latency + processing
  await sleep(Math.random() * 0.2 + 0.1); // 100-300ms
  const duration = Date.now() - start;
  return { id, duration, success: true };
}

async function main() {
  console.log(`Starting Load Test: ${RPS_TARGET} RPS for ${DURATION_SEC}s`);

  const results: any[] = [];
  const startTime = Date.now();

  let requestsSent = 0;

  while (Date.now() - startTime < DURATION_SEC * 1000) {
    const batchStart = Date.now();
    const promises = [];

    // Send batch
    for (let i = 0; i < CONCURRENCY; i++) {
      promises.push(simulateRequest(requestsSent++));
    }

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // Throttle to match RPS
    const batchDuration = Date.now() - batchStart;
    const targetBatchDuration = (1000 / RPS_TARGET) * CONCURRENCY;

    if (batchDuration < targetBatchDuration) {
      await sleep((targetBatchDuration - batchDuration) / 1000);
    }
  }

  // Analysis
  const totalRequests = results.length;
  const avgLatency = results.reduce((acc, r) => acc + r.duration, 0) /
    totalRequests;
  const p95Latency =
    results.sort((a, b) =>
      a.duration - b.duration
    )[Math.floor(totalRequests * 0.95)].duration;

  console.log("\n=== Load Test Results ===");
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Actual RPS: ${(totalRequests / DURATION_SEC).toFixed(2)}`);
  console.log(`Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`P95 Latency: ${p95Latency.toFixed(2)}ms`);
  console.log(`Error Rate: 0% (Simulated)`);

  if (p95Latency < 500) {
    console.log("✅ Latency within SLA (<500ms)");
  } else {
    console.log("⚠️ Latency warning");
  }
}

main();
