import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Shield, 
  Zap, 
  Bug, 
  Database, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { performanceMonitor, cacheManager } from '@/lib/performance';
import { scanForVulnerabilities, rateLimiter } from '@/lib/security';
import { performanceTester, runIntegrationTests } from '@/lib/testing';

interface MonitoringData {
  performance: any;
  security: string[];
  cache: any;
  tests: any[];
  system: {
    uptime: number;
    memory: number;
    errors: number;
  };
}

export const ProductionMonitor: React.FC = () => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      
      const [performanceData, securityIssues, cacheStats, testResults] = await Promise.all([
        performanceMonitor.getSummary(),
        scanForVulnerabilities(),
        cacheManager.getStats(),
        runIntegrationTests().catch(() => [])
      ]);

      const systemData = {
        uptime: performance.now(),
        memory: (performance as any).memory?.usedJSHeapSize || 0,
        errors: performanceData.slowestOperations?.filter(op => op.duration > 1000).length || 0
      };

      setData({
        performance: performanceData,
        security: securityIssues,
        cache: cacheStats,
        tests: testResults,
        system: systemData
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'success';
    if (value < thresholds[1]) return 'warning';
    return 'destructive';
  };

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and diagnostics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            Last Updated: {lastUpdate.toLocaleTimeString()}
          </Badge>
          <Button onClick={fetchMonitoringData} disabled={loading}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {data?.security.length === 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Healthy
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Issues
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.security.length || 0} security issues detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.performance.averageDuration?.toFixed(1) || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(data?.system.memory || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              JavaScript heap size
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime(data?.system.uptime || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Session duration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Real-time application performance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Metrics</label>
                  <div className="text-2xl font-bold">{data?.performance.totalMetrics || 0}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recent Activity</label>
                  <div className="text-2xl font-bold">{data?.performance.recentMetrics || 0}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Long Tasks</label>
                  <div className="text-2xl font-bold">{data?.performance.longTasks || 0}</div>
                </div>
              </div>

              {data?.performance.slowestOperations?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slowest Operations</label>
                  <div className="space-y-2">
                    {data.performance.slowestOperations.slice(0, 5).map((op: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">{op.name}</span>
                        <Badge variant={op.duration > 1000 ? 'destructive' : 'secondary'}>
                          {op.duration.toFixed(1)}ms
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Analysis</CardTitle>
              <CardDescription>
                Automated security vulnerability scanning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.security.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No security issues detected. Your application appears to be secure.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {data?.security.map((issue, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{issue}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
              <CardDescription>
                Application cache performance and utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cache Size</label>
                  <div className="text-2xl font-bold">{data?.cache.size || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.cache.memoryThreshold || 0} max entries
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Utilization</label>
                  <div className="text-2xl font-bold">
                    {data?.cache.size && data?.cache.memoryThreshold
                      ? Math.round((data.cache.size / data.cache.memoryThreshold) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Tests</CardTitle>
              <CardDescription>
                Automated API and integration test results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.tests.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No test results available. Integration tests may be disabled.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {data?.tests.map((test, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">{test.name}</span>
                      <div className="flex items-center gap-2">
                        {test.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant={test.success ? 'secondary' : 'destructive'}>
                          {test.duration?.toFixed(0)}ms
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};