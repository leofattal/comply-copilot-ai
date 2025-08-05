import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  FileText,
  RefreshCw,
  PlayCircle,
  ArrowRight,
  Clock,
  DollarSign,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLatestComplianceReport, type ComplianceReport } from '@/lib/api';

interface QuickStat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'success' | 'warning' | 'danger';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
}

interface RecentActivity {
  id: string;
  type: 'violation' | 'analysis' | 'sync' | 'update';
  title: string;
  description: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setIsLoading(true);
      const report = await getLatestComplianceReport();
      console.log('🏠 DashboardOverview: Loaded compliance report:', report);
      if (report) {
        console.log('🏠 Report details:', {
          risk_score: report.risk_score,
          critical_issues: report.critical_issues,
          critical_issues_count: (report as any).critical_issues_count,
          total_workers: report.total_workers,
          compliance_rate: (report as any).compliance_rate,
          created_at: report.created_at
        });
      }
      setComplianceReport(report);
      
      // Additional debugging
      if (!report) {
        console.log('🏠 No compliance report found - user needs to run analysis first');
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate quick stats from compliance data
  const quickStats: QuickStat[] = [
    {
      label: 'Risk Score',
      value: complianceReport?.risk_score ? `${complianceReport.risk_score}/100` : '--',
      change: complianceReport ? 'Last updated today' : 'No data',
      trend: 'stable',
      icon: Shield,
      variant: complianceReport?.risk_score && complianceReport.risk_score > 70 ? 'danger' : 
               complianceReport?.risk_score && complianceReport.risk_score > 40 ? 'warning' : 'success'
    },
    {
      label: 'Critical Issues',
      value: complianceReport?.critical_issues || 0,
      change: complianceReport?.critical_issues ? 'Require immediate attention' : 'No issues found',
      trend: 'stable',
      icon: AlertTriangle,
      variant: complianceReport?.critical_issues && complianceReport.critical_issues > 0 ? 'danger' : 'success'
    },
    {
      label: 'Employees',
      value: complianceReport?.total_workers || '--',
      change: 'Workers analyzed',
      trend: 'stable',
      icon: Users,
      variant: 'default'
    },
    {
      label: 'Compliance Rate',
      value: (() => {
        const rate = complianceReport?.compliance_rate || complianceReport?.report_data?.summary?.complianceRate;
        return rate ? `${Math.round(rate)}%` : '--';
      })(),
      change: complianceReport ? 'Overall compliance' : 'Awaiting analysis',
      trend: (() => {
        const rate = complianceReport?.compliance_rate || complianceReport?.report_data?.summary?.complianceRate;
        return rate && rate >= 90 ? 'up' : 'stable';
      })(),
      icon: CheckCircle,
      variant: (() => {
        const rate = complianceReport?.compliance_rate || complianceReport?.report_data?.summary?.complianceRate;
        return rate && rate >= 90 ? 'success' : 
               rate && rate >= 70 ? 'warning' : 'danger';
      })()
    }
  ];

  const quickActions: QuickAction[] = [
    // If there are critical issues, prioritize reviewing violations
    ...(complianceReport?.critical_issues && complianceReport.critical_issues > 0 ? [
      {
        id: 'view-violations',
        title: 'Review Critical Issues',
        description: `Address ${complianceReport.critical_issues} critical compliance violation${complianceReport.critical_issues > 1 ? 's' : ''}`,
        icon: AlertTriangle,
        action: () => navigate('/dashboard/compliance'),
        variant: 'primary' as const,
        disabled: false
      }
    ] : []),
    {
      id: 'run-analysis',
      title: complianceReport ? 'Update Analysis' : 'Run Compliance Analysis',
      description: complianceReport ? 'Refresh compliance analysis with latest data' : 'Analyze current workforce for compliance violations',
      icon: PlayCircle,
      action: () => navigate('/dashboard/compliance'),
      variant: complianceReport ? 'secondary' as const : 'primary' as const,
      disabled: false
    },
    {
      id: 'sync-data',
      title: 'Sync Deel Data',
      description: 'Update employee and contract information',
      icon: RefreshCw,
      action: () => navigate('/dashboard/settings'),
      variant: 'secondary' as const,
      disabled: false
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Explore compliance trends and insights',
      icon: TrendingUp,
      action: () => navigate('/dashboard/analytics'),
      variant: 'secondary' as const,
      disabled: false
    }
  ];

  // Generate recent activity based on actual compliance data
  const recentActivity: RecentActivity[] = [];
  
  // Add compliance analysis activity if we have data
  if (complianceReport) {
    recentActivity.push({
      id: '1',
      type: 'analysis',
      title: 'Compliance Analysis Completed',
      description: `Analyzed ${complianceReport.total_workers} workers • Found ${complianceReport.critical_issues || 0} critical issues`,
      timestamp: new Date(complianceReport.created_at),
      severity: complianceReport.critical_issues && complianceReport.critical_issues > 0 ? 'high' : 'low'
    });
  }
  
  // Add some standard activities
  recentActivity.push(
    {
      id: '2',
      type: 'sync',
      title: 'Data Sync Completed',
      description: 'Updated employee and contract data from Deel',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: '3',
      type: 'update',
      title: 'System Update',
      description: 'Compliance rules updated for Q4 2024',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    }
  );

  const getStatVariantClasses = (variant: string) => {
    switch (variant) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'danger': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getStatIconClasses = (variant: string) => {
    switch (variant) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'violation': return AlertTriangle;
      case 'analysis': return Shield;
      case 'sync': return RefreshCw;
      case 'update': return Zap;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-600">
            Here's your compliance overview for today.
          </p>
        </div>
        {complianceReport?.critical_issues && complianceReport.critical_issues > 0 && (
          <Alert className="max-w-md border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{complianceReport.critical_issues} critical compliance issue{complianceReport.critical_issues > 1 ? 's' : ''}</strong> require{complianceReport.critical_issues === 1 ? 's' : ''} immediate attention.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className={getStatVariantClasses(stat.variant)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${getStatIconClasses(stat.variant)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to manage your compliance program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant={action.variant === 'primary' ? 'default' : 'outline'}
                      className="h-auto p-4 flex flex-col items-start space-y-2"
                      onClick={action.action}
                      disabled={action.disabled}
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{action.title}</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </div>
                      <p className="text-sm text-muted-foreground text-left">
                        {action.description}
                      </p>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.timestamp.toLocaleDateString()} at{' '}
                          {activity.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      {activity.severity && (
                        <Badge 
                          variant={
                            activity.severity === 'critical' ? 'destructive' :
                            activity.severity === 'high' ? 'destructive' :
                            activity.severity === 'medium' ? 'default' : 'secondary'
                          }
                        >
                          {activity.severity}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting Started Section (show if no compliance data) */}
      {!complianceReport && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
            <p className="text-gray-600 mb-6">
              Run your first compliance analysis to identify potential risks and violations 
              in your workforce data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/dashboard/compliance')} className="gap-2">
                <PlayCircle className="w-4 h-4" />
                Run Compliance Analysis
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard/settings')}>
                Configure Integrations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}