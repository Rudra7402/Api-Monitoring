// Keep empty definitions to satisfy TS compilation during migration
export const store = {
  initialized: true,
  users: [] ,
  clients: [] ,
  clientUsers: [] ,
  apiKeys: [] ,
  dlq: [] ,
  dlqStats: { pending: 0, investigated: 0, replayed: 0, deleted: 0 },
  processor: { totalEvents: 0, rate: 0, failureRate: 0 },
  exports: [] ,
};

export const analytics = {
  dashboard: {
    totalHits: 0,
    successRate: 0,
    errorRate: 0,
    avgResponseTime: 0,
  },
  responseTime: [] ,
  statusDist: [] ,
  topEndpoints: [] ,
  services: [] ,
  errorTrend: [] ,
  slowest: [] ,
};

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}