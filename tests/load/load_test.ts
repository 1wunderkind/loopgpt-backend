/**
 * Load Testing Script
 * Tests system performance under load
 */

interface LoadTestConfig {
  baseUrl: string;
  duration: number; // seconds
  concurrency: number;
  rampUp: number; // seconds
  endpoints: EndpointTest[];
}

interface EndpointTest {
  name: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  weight: number; // 0-1, probability of selection
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  duration: number;
  endpointResults: Map<string, EndpointResult>;
}

interface EndpointResult {
  requests: number;
  successes: number;
  failures: number;
  avgResponseTime: number;
  errors: string[];
}

class LoadTester {
  private config: LoadTestConfig;
  private results: number[] = [];
  private errors: Map<string, string[]> = new Map();
  private endpointStats: Map<string, EndpointResult> = new Map();
  private startTime: number = 0;
  private activeRequests: number = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  /**
   * Run load test
   */
  async run(): Promise<LoadTestResult> {
    console.log(`\n🚀 Starting load test...`);
    console.log(`Duration: ${this.config.duration}s`);
    console.log(`Concurrency: ${this.config.concurrency}`);
    console.log(`Ramp-up: ${this.config.rampUp}s`);
    console.log(`Endpoints: ${this.config.endpoints.length}\n`);

    this.startTime = Date.now();
    const endTime = this.startTime + (this.config.duration * 1000);

    // Ramp up workers
    const workers: Promise<void>[] = [];
    const rampUpDelay = (this.config.rampUp * 1000) / this.config.concurrency;

    for (let i = 0; i < this.config.concurrency; i++) {
      await new Promise(resolve => setTimeout(resolve, rampUpDelay));
      workers.push(this.worker(endTime));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    // Calculate results
    return this.calculateResults();
  }

  /**
   * Worker that makes requests
   */
  private async worker(endTime: number): Promise<void> {
    while (Date.now() < endTime) {
      const endpoint = this.selectEndpoint();
      await this.makeRequest(endpoint);
    }
  }

  /**
   * Select random endpoint based on weights
   */
  private selectEndpoint(): EndpointTest {
    const random = Math.random();
    let cumulative = 0;

    for (const endpoint of this.config.endpoints) {
      cumulative += endpoint.weight;
      if (random <= cumulative) {
        return endpoint;
      }
    }

    return this.config.endpoints[0];
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(endpoint: EndpointTest): Promise<void> {
    const url = `${this.config.baseUrl}${endpoint.path}`;
    const startTime = Date.now();

    this.activeRequests++;

    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers: endpoint.headers,
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      });

      const responseTime = Date.now() - startTime;
      this.results.push(responseTime);

      // Update endpoint stats
      const stats = this.endpointStats.get(endpoint.name) || {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0,
        errors: [],
      };

      stats.requests++;

      if (response.ok) {
        stats.successes++;
      } else {
        stats.failures++;
        stats.errors.push(`HTTP ${response.status}: ${response.statusText}`);
      }

      stats.avgResponseTime = (stats.avgResponseTime * (stats.requests - 1) + responseTime) / stats.requests;

      this.endpointStats.set(endpoint.name, stats);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.results.push(responseTime);

      // Record error
      const errors = this.errors.get(endpoint.name) || [];
      errors.push(error instanceof Error ? error.message : String(error));
      this.errors.set(endpoint.name, errors);

      // Update endpoint stats
      const stats = this.endpointStats.get(endpoint.name) || {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0,
        errors: [],
      };

      stats.requests++;
      stats.failures++;
      stats.errors.push(error instanceof Error ? error.message : String(error));
      stats.avgResponseTime = (stats.avgResponseTime * (stats.requests - 1) + responseTime) / stats.requests;

      this.endpointStats.set(endpoint.name, stats);
    }

    this.activeRequests--;
  }

  /**
   * Calculate test results
   */
  private calculateResults(): LoadTestResult {
    const duration = (Date.now() - this.startTime) / 1000;
    const totalRequests = this.results.length;
    const failedRequests = Array.from(this.endpointStats.values())
      .reduce((sum, stats) => sum + stats.failures, 0);
    const successfulRequests = totalRequests - failedRequests;

    // Sort response times for percentile calculation
    const sorted = this.results.sort((a, b) => a - b);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: this.average(this.results),
      minResponseTime: Math.min(...this.results),
      maxResponseTime: Math.max(...this.results),
      p50ResponseTime: this.percentile(sorted, 50),
      p95ResponseTime: this.percentile(sorted, 95),
      p99ResponseTime: this.percentile(sorted, 99),
      requestsPerSecond: totalRequests / duration,
      errorRate: failedRequests / totalRequests,
      duration,
      endpointResults: this.endpointStats,
    };
  }

  /**
   * Calculate average
   */
  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

/**
 * Print results
 */
function printResults(results: LoadTestResult): void {
  console.log(`\n📊 Load Test Results\n`);
  console.log(`Duration: ${results.duration.toFixed(2)}s`);
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Successful: ${results.successfulRequests} (${(results.successfulRequests / results.totalRequests * 100).toFixed(2)}%)`);
  console.log(`Failed: ${results.failedRequests} (${(results.errorRate * 100).toFixed(2)}%)`);
  console.log(`\nPerformance:`);
  console.log(`  Requests/sec: ${results.requestsPerSecond.toFixed(2)}`);
  console.log(`  Avg Response: ${results.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Min Response: ${results.minResponseTime.toFixed(2)}ms`);
  console.log(`  Max Response: ${results.maxResponseTime.toFixed(2)}ms`);
  console.log(`  P50 Response: ${results.p50ResponseTime.toFixed(2)}ms`);
  console.log(`  P95 Response: ${results.p95ResponseTime.toFixed(2)}ms`);
  console.log(`  P99 Response: ${results.p99ResponseTime.toFixed(2)}ms`);

  console.log(`\n📈 Endpoint Results:\n`);
  for (const [name, stats] of results.endpointResults) {
    console.log(`${name}:`);
    console.log(`  Requests: ${stats.requests}`);
    console.log(`  Success Rate: ${(stats.successes / stats.requests * 100).toFixed(2)}%`);
    console.log(`  Avg Response: ${stats.avgResponseTime.toFixed(2)}ms`);
    if (stats.errors.length > 0) {
      console.log(`  Errors: ${stats.errors.slice(0, 3).join(', ')}`);
    }
    console.log();
  }

  // Pass/Fail criteria
  console.log(`\n✅ Pass/Fail Criteria:\n`);
  const checks = [
    { name: 'Error rate < 1%', pass: results.errorRate < 0.01, value: `${(results.errorRate * 100).toFixed(2)}%` },
    { name: 'P95 response < 2000ms', pass: results.p95ResponseTime < 2000, value: `${results.p95ResponseTime.toFixed(2)}ms` },
    { name: 'P99 response < 5000ms', pass: results.p99ResponseTime < 5000, value: `${results.p99ResponseTime.toFixed(2)}ms` },
    { name: 'Throughput > 10 req/s', pass: results.requestsPerSecond > 10, value: `${results.requestsPerSecond.toFixed(2)} req/s` },
  ];

  for (const check of checks) {
    const status = check.pass ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${check.value}`);
  }

  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}\n`);
}

/**
 * Main load test scenarios
 */

// Scenario 1: Light Load (100 users)
const lightLoadConfig: LoadTestConfig = {
  baseUrl: 'https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1',
  duration: 60, // 1 minute
  concurrency: 100,
  rampUp: 10,
  endpoints: [
    {
      name: 'Health Check',
      method: 'GET',
      path: '/health',
      weight: 0.1,
    },
    {
      name: 'Food Search',
      method: 'POST',
      path: '/loopgpt_food_search',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Deno.env.get('SUPABASE_ANON_KEY'),
      },
      body: {
        query: 'chicken breast',
        limit: 10,
      },
      weight: 0.4,
    },
    {
      name: 'Store Search',
      method: 'POST',
      path: '/loopgpt_store_search',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Deno.env.get('SUPABASE_ANON_KEY'),
      },
      body: {
        address: '123 Main St, San Francisco, CA 94102',
        provider: 'instacart',
      },
      weight: 0.3,
    },
    {
      name: 'Product Search',
      method: 'POST',
      path: '/loopgpt_product_search',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Deno.env.get('SUPABASE_ANON_KEY'),
      },
      body: {
        query: 'milk',
        storeId: 'store123',
        provider: 'instacart',
      },
      weight: 0.2,
    },
  ],
};

// Scenario 2: Normal Load (500 users)
const normalLoadConfig: LoadTestConfig = {
  ...lightLoadConfig,
  concurrency: 500,
  duration: 120, // 2 minutes
  rampUp: 30,
};

// Scenario 3: Peak Load (1000 users)
const peakLoadConfig: LoadTestConfig = {
  ...lightLoadConfig,
  concurrency: 1000,
  duration: 180, // 3 minutes
  rampUp: 60,
};

// Scenario 4: Stress Test (2000 users)
const stressTestConfig: LoadTestConfig = {
  ...lightLoadConfig,
  concurrency: 2000,
  duration: 300, // 5 minutes
  rampUp: 120,
};

/**
 * Run load tests
 */
async function main() {
  const scenario = Deno.args[0] || 'light';

  const configs: Record<string, LoadTestConfig> = {
    light: lightLoadConfig,
    normal: normalLoadConfig,
    peak: peakLoadConfig,
    stress: stressTestConfig,
  };

  const config = configs[scenario];

  if (!config) {
    console.error(`Unknown scenario: ${scenario}`);
    console.log(`Available scenarios: ${Object.keys(configs).join(', ')}`);
    Deno.exit(1);
  }

  console.log(`\n🎯 Running ${scenario} load test...\n`);

  const tester = new LoadTester(config);
  const results = await tester.run();

  printResults(results);

  // Exit with error code if checks failed
  const allPassed = results.errorRate < 0.01 &&
    results.p95ResponseTime < 2000 &&
    results.p99ResponseTime < 5000 &&
    results.requestsPerSecond > 10;

  Deno.exit(allPassed ? 0 : 1);
}

// Run if main module
if (import.meta.main) {
  main();
}
