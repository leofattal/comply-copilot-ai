import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings,
  Link,
  Bell,
  Shield,
  Users,
  Database,
  Key,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import DeelIntegration from '@/components/DeelIntegration';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: React.ComponentType<{ className?: string }>;
  lastSync?: Date;
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    violations: true,
    weekly_reports: true,
    policy_updates: false,
    system_alerts: true
  });

  const [privacy, setPrivacy] = useState({
    data_retention: '12',
    anonymize_reports: false,
    share_analytics: true
  });

  const integrations: Integration[] = [
    {
      id: 'deel',
      name: 'Deel',
      description: 'Employee and contract management platform',
      status: 'connected',
      icon: Users,
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'AI-powered compliance analysis engine',
      status: 'connected',
      icon: Shield,
      lastSync: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team notifications and alerts',
      status: 'disconnected',
      icon: Bell
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'CRM and employee data integration',
      status: 'disconnected',
      icon: Database
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle;
      case 'error': return AlertTriangle;
      default: return RefreshCw;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account, integrations, and preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Deel Integration - Primary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Deel Integration
              </CardTitle>
              <CardDescription>
                Connect to Deel to sync employee and contract data for compliance analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeelIntegration />
            </CardContent>
          </Card>

          {/* Other Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>Available Integrations</CardTitle>
              <CardDescription>
                Connect additional services to enhance your compliance workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => {
                  const Icon = integration.icon;
                  const StatusIcon = getStatusIcon(integration.status);
                  
                  return (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{integration.name}</h4>
                          <p className="text-sm text-gray-500">{integration.description}</p>
                          {integration.lastSync && (
                            <p className="text-xs text-gray-400 mt-1">
                              Last sync: {integration.lastSync.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(integration.status)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {integration.status}
                        </Badge>
                        <Button 
                          variant={integration.status === 'connected' ? 'outline' : 'default'}
                          size="sm"
                        >
                          {integration.status === 'connected' ? 'Configure' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive and how
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="violations">Compliance Violations</Label>
                    <p className="text-sm text-gray-500">Get notified when new violations are detected</p>
                  </div>
                  <Switch 
                    id="violations"
                    checked={notifications.violations}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, violations: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reports">Weekly Reports</Label>
                    <p className="text-sm text-gray-500">Receive weekly compliance summary reports</p>
                  </div>
                  <Switch 
                    id="reports"
                    checked={notifications.weekly_reports}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, weekly_reports: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="policy">Policy Updates</Label>
                    <p className="text-sm text-gray-500">Get notified about changes in labor laws and regulations</p>
                  </div>
                  <Switch 
                    id="policy"
                    checked={notifications.policy_updates}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, policy_updates: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="system">System Alerts</Label>
                    <p className="text-sm text-gray-500">Important system updates and maintenance notifications</p>
                  </div>
                  <Switch 
                    id="system"
                    checked={notifications.system_alerts}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, system_alerts: checked }))
                    }
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-4">Delivery Methods</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="email" defaultChecked className="rounded" />
                    <Label htmlFor="email">Email notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="browser" defaultChecked className="rounded" />
                    <Label htmlFor="browser">Browser notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="slack-notify" className="rounded" />
                    <Label htmlFor="slack-notify">Slack notifications (requires Slack integration)</Label>
                  </div>
                </div>
              </div>

              <Button className="mt-6">Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input type="password" id="current-password" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input type="password" id="new-password" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input type="password" id="confirm-password" className="mt-1" />
                </div>

                <Button>Update Password</Button>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium mb-4">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">Setup 2FA</Button>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-4">API Access</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">Production API Key</p>
                      <p className="text-sm text-gray-500">Used for live compliance data access</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Key className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">Sandbox API Key</p>
                      <p className="text-sm text-gray-500">Used for testing and development</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Key className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data</CardTitle>
              <CardDescription>
                Control how your data is used and stored
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="retention">Data Retention Period (months)</Label>
                  <Input 
                    type="number" 
                    id="retention" 
                    value={privacy.data_retention}
                    onChange={(e) => setPrivacy(prev => ({ ...prev, data_retention: e.target.value }))}
                    className="mt-1 max-w-xs"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    How long to keep compliance data before automatic deletion
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="anonymize">Anonymize Reports</Label>
                    <p className="text-sm text-gray-500">Remove personal identifiers from exported reports</p>
                  </div>
                  <Switch 
                    id="anonymize"
                    checked={privacy.anonymize_reports}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, anonymize_reports: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analytics">Share Anonymous Analytics</Label>
                    <p className="text-sm text-gray-500">Help improve the product with anonymous usage data</p>
                  </div>
                  <Switch 
                    id="analytics"
                    checked={privacy.share_analytics}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, share_analytics: checked }))
                    }
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium mb-4">Data Export & Deletion</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="gap-2">
                    <Database className="w-4 h-4" />
                    Export All Data
                  </Button>
                  <Button variant="destructive" className="gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Delete Account & Data
                  </Button>
                </div>
              </div>

              <Button className="mt-6">Save Privacy Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details and subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Company Name</Label>
                    <Input type="text" id="company" placeholder="Your Company" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input type="text" id="industry" placeholder="Technology" className="mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employees-count">Number of Employees</Label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1">
                      <option>1-10</option>
                      <option>11-50</option>
                      <option>51-200</option>
                      <option>201-1000</option>
                      <option>1000+</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1">
                      <option>UTC-8 (PST)</option>
                      <option>UTC-5 (EST)</option>
                      <option>UTC+0 (GMT)</option>
                      <option>UTC+1 (CET)</option>
                    </select>
                  </div>
                </div>

                <Button>Update Account</Button>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium mb-4">Subscription</h4>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">Professional Plan</p>
                    <p className="text-sm text-gray-600">$99/month • Next billing: January 15, 2024</p>
                  </div>
                  <Button variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Billing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}