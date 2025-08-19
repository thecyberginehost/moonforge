// Testing utilities and helpers for the production app

export interface TestConfig {
  environment: 'development' | 'staging' | 'production';
  apiEndpoint: string;
  mockData: boolean;
  performance: boolean;
  coverage: boolean;
}

// Mock data generators for testing
export const generateMockToken = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Token',
  symbol: 'TEST',
  description: 'A test token for development',
  image_url: 'https://example.com/test-token.png',
  creator_wallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  mint_address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  bonding_curve_address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  total_supply: 1000000000,
  market_cap: 50000,
  price: 0.00005,
  volume_24h: 10000,
  holder_count: 150,
  sol_raised: 25,
  tokens_sold: 500000000,
  is_graduated: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const generateMockTradingActivity = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174001',
  token_id: '123e4567-e89b-12d3-a456-426614174000',
  user_wallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  activity_type: 'buy',
  amount_sol: 1.5,
  token_amount: 30000,
  token_price: 0.00005,
  market_cap_at_time: 45000,
  profit_loss: 0,
  profit_percentage: 0,
  time_since_launch_minutes: 120,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const generateMockWallet = () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

// Test data sets for different scenarios
export const TestDataSets = {
  tokens: {
    earlyStage: generateMockToken({ market_cap: 5000, sol_raised: 2.5 }),
    midStage: generateMockToken({ market_cap: 25000, sol_raised: 12.5 }),
    nearGraduation: generateMockToken({ market_cap: 48000, sol_raised: 24 }),
    graduated: generateMockToken({ market_cap: 75000, sol_raised: 30, is_graduated: true })
  },
  trading: {
    profitableTrade: generateMockTradingActivity({ 
      activity_type: 'sell', 
      profit_loss: 0.5, 
      profit_percentage: 33.33 
    }),
    losingTrade: generateMockTradingActivity({ 
      activity_type: 'sell', 
      profit_loss: -0.3, 
      profit_percentage: -20 
    }),
    largeTrade: generateMockTradingActivity({ amount_sol: 10, token_amount: 200000 }),
    smallTrade: generateMockTradingActivity({ amount_sol: 0.1, token_amount: 2000 })
  }
};

// Performance testing utilities
export class PerformanceTester {
  private metrics: { [key: string]: number[] } = {};

  startTimer(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
      return duration;
    };
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics[label]) {
      this.metrics[label] = [];
    }
    this.metrics[label].push(value);
  }

  getStats(label: string) {
    const values = this.metrics[label] || [];
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  getAllStats() {
    const stats: { [key: string]: any } = {};
    Object.keys(this.metrics).forEach(label => {
      stats[label] = this.getStats(label);
    });
    return stats;
  }

  clear(): void {
    this.metrics = {};
  }
}

// API testing utilities
export class APITester {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string, headers = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
  }

  async testEndpoint(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    expectedStatus = 200
  ) {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      method,
      headers: this.defaultHeaders
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const start = performance.now();
    
    try {
      const response = await fetch(url, config);
      const duration = performance.now() - start;
      const data = await response.json();

      return {
        success: response.status === expectedStatus,
        status: response.status,
        duration,
        data,
        url,
        method
      };
    } catch (error) {
      const duration = performance.now() - start;
      return {
        success: false,
        status: 0,
        duration,
        error: error.message,
        url,
        method
      };
    }
  }

  async loadTest(
    endpoint: string,
    concurrent: number = 10,
    duration: number = 30000
  ) {
    const results: any[] = [];
    const startTime = Date.now();
    
    const runTest = async () => {
      while (Date.now() - startTime < duration) {
        const result = await this.testEndpoint(endpoint);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
    };

    // Run concurrent tests
    const promises = Array(concurrent).fill(null).map(() => runTest());
    await Promise.all(promises);

    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const durations = successful.map(r => r.duration);

    return {
      totalRequests: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / results.length) * 100,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxResponseTime: Math.max(...durations),
      minResponseTime: Math.min(...durations),
      requestsPerSecond: results.length / (duration / 1000)
    };
  }
}

// Component testing utilities
export const TestHelpers = {
  // Wait for element to appear
  waitForElement: (selector: string, timeout = 5000): Promise<Element> => {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  },

  // Simulate user interaction
  simulateClick: (element: Element): void => {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  },

  simulateInput: (element: HTMLInputElement, value: string): void => {
    element.value = value;
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  },

  // Check accessibility
  checkAccessibility: (element: Element): string[] => {
    const issues: string[] = [];

    // Check for alt text on images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.getAttribute('alt')) {
        issues.push(`Image missing alt text: ${img.src}`);
      }
    });

    // Check for labels on inputs
    const inputs = element.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      if (!label && !input.getAttribute('aria-label')) {
        issues.push(`Input missing label: ${input.outerHTML.substring(0, 50)}...`);
      }
    });

    // Check for heading hierarchy
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName[1]);
      if (level > previousLevel + 1) {
        issues.push(`Heading hierarchy skip: ${heading.tagName} after H${previousLevel}`);
      }
      previousLevel = level;
    });

    return issues;
  }
};

// Global performance tester instance
export const performanceTester = new PerformanceTester();

// Environment-specific configurations
export const getTestConfig = (): TestConfig => {
  const isDev = process.env.NODE_ENV === 'development';
  const isStaging = window.location.hostname.includes('staging');
  
  return {
    environment: isDev ? 'development' : isStaging ? 'staging' : 'production',
    apiEndpoint: isDev ? 'http://localhost:3000' : window.location.origin,
    mockData: isDev,
    performance: true,
    coverage: isDev
  };
};

// Integration test runner
export const runIntegrationTests = async () => {
  const config = getTestConfig();
  const apiTester = new APITester(config.apiEndpoint);
  
  const tests = [
    {
      name: 'Health Check',
      test: () => apiTester.testEndpoint('/health', 'GET', null, 200)
    },
    {
      name: 'Token List',
      test: () => apiTester.testEndpoint('/api/tokens', 'GET', null, 200)
    },
    {
      name: 'User Portfolio',
      test: () => apiTester.testEndpoint('/api/portfolio/test-wallet', 'GET', null, 200)
    }
  ];

  const results = [];
  for (const test of tests) {
    try {
      const result = await test.test();
      results.push({
        name: test.name,
        ...result
      });
    } catch (error) {
      results.push({
        name: test.name,
        success: false,
        error: error.message
      });
    }
  }

  return results;
};