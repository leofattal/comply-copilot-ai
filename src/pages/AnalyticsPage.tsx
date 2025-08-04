import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Shield
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  period: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'positive' | 'negative' | 'neutral';
}

interface ComplianceMetric {
  category: string;
  current: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  issues: number;
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Mock analytics data - in real app, this would come from API
  const keyMetrics: MetricCard[] = [
    {
      title: 'Compliance Score',
      value: '87%',
      change: 5.2,
      period: 'vs last month',
      icon: Shield,
      variant: 'positive'
    },
    {
      title: 'Violations Detected',
      value: 12,
      change: -25,
      period: 'vs last month',
      icon: AlertTriangle,
      variant: 'positive'
    },
    {
      title: 'Risk Score',
      value: 23,
      change: -12,
      period: 'vs last month',
      icon: TrendingDown,
      variant: 'positive'
    },
    {
      title: 'Audit Readiness',
      value: '94%',
      change: 8.1,
      period: 'vs last month',
      icon: CheckCircle,
      variant: 'positive'
    }
  ];

  const complianceMetrics: ComplianceMetric[] = [
    {
      category: 'Wage & Hour',
      current: 92,
      target: 95,
      trend: 'up',
      issues: 3
    },
    {
      category: 'Classification',
      current: 88,
      target: 90,
      trend: 'stable',
      issues: 2
    },
    {
      category: 'Benefits',
      current: 95,
      target: 95,
      trend: 'up',
      issues: 0
    },
    {
      category: 'Documentation',
      current: 85,
      target: 90,
      trend: 'down',
      issues: 5
    }
  ];

  const recentTrends = [
    {
      date: '2024-01-15',
      violations: 8,
      resolved: 12,
      score: 85
    },
    {
      date: '2024-01-14',
      violations: 15,
      resolved: 8,
      score: 82
    },
    {
      date: '2024-01-13',
      violations: 12,
      resolved: 10,
      score: 84
    },
    {
      date: '2024-01-12',
      violations: 18,
      resolved: 6,
      score: 79
    },
    {
      date: '2024-01-11',
      violations: 22,
      resolved: 4,
      score: 76
    }
  ];

  const getMetricIcon = (variant: string) => {
    switch (variant) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      default: return BarChart3;
    }
  };

  const getMetricColor = (variant: string) => {
    switch (variant) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return BarChart3;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Track compliance performance and identify trends
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = getMetricIcon(metric.variant);
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-8 h-8 text-blue-600" />
                  <div className={`flex items-center gap-1 text-sm ${getMetricColor(metric.variant)}`}>
                    <TrendIcon className="w-4 h-4" />
                    {Math.abs(metric.change)}%
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {metric.value}
                  </p>
                  <p className="text-sm text-gray-500">{metric.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{metric.period}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status Overview</CardTitle>
                <CardDescription>
                  Current compliance status across all categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceMetrics.map((metric, index) => {
                    const TrendIcon = getTrendIcon(metric.trend);
                    const percentage = (metric.current / metric.target) * 100;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{metric.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {metric.current}% / {metric.target}%
                            </span>
                            <TrendIcon className={`w-4 h-4 ${getTrendColor(metric.trend)}`} />
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              percentage >= 100 ? 'bg-green-500' :
                              percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        {metric.issues > 0 && (
                          <p className="text-sm text-red-600">
                            {metric.issues} active issue{metric.issues > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest compliance-related events and changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Compliance analysis completed</p>
                      <p className="text-xs text-gray-500">12 violations detected, 5 resolved</p>
                      <p className="text-xs text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">New wage & hour regulation update</p>
                      <p className="text-xs text-gray-500">California minimum wage increase</p>
                      <p className="text-xs text-gray-400">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Risk score increased</p>
                      <p className="text-xs text-gray-500">New violations in documentation category</p>
                      <p className="text-xs text-gray-400">3 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Employee classification updated</p>
                      <p className="text-xs text-gray-500">15 contractor agreements reviewed</p>
                      <p className="text-xs text-gray-400">1 week ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Compliance Breakdown</CardTitle>
              <CardDescription>
                In-depth analysis of compliance performance by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {complianceMetrics.map((metric, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{metric.category}</h4>
                        <Badge variant={metric.issues > 0 ? "destructive" : "default"}>
                          {metric.issues} issues
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Current Score</span>
                          <span className="font-medium">{metric.current}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Target Score</span>
                          <span className="font-medium">{metric.target}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(metric.current / metric.target) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>
                Historical view of your compliance performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Trend Analysis</h3>
                  <p className="text-gray-500 mb-4">
                    Interactive charts and trend analysis will be displayed here.
                  </p>
                  <p className="text-sm text-gray-400">
                    Chart visualization coming soon...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>
                Generate and download detailed compliance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <FileText className="w-6 h-6" />
                  <span>Monthly Summary</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span>Violations Report</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Users className="w-6 h-6" />
                  <span>Employee Audit</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <DollarSign className="w-6 h-6" />
                  <span>Wage & Hour Report</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Shield className="w-6 h-6" />
                  <span>Risk Assessment</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Calendar className="w-6 h-6" />
                  <span>Custom Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}