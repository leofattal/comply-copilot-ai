import React, { useState } from 'react';
import DeelIntegration from '@/components/DeelIntegration';
import ComplianceReview from '@/components/ComplianceReview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  ArrowLeft,
  LogOut,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type DeelEmployee, type DeelContract, type DeelComplianceAlert } from '@/lib/api';

interface DeelDashboardProps {
  onBack?: () => void;
}

export default function DeelDashboard({ onBack }: DeelDashboardProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deelData, setDeelData] = useState<{
    employees: DeelEmployee[];
    contracts: DeelContract[];
    alerts: DeelComplianceAlert[];
  }>({ employees: [], contracts: [], alerts: [] });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Deel Integration</h1>
                <p className="text-sm text-gray-500">HR Compliance Automation Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">User:</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="integration" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="integration" className="space-y-6">
            <DeelIntegration onDataLoad={setDeelData} />
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Management ({deelData.employees.length} employees)
                </CardTitle>
                <CardDescription>
                  View and manage employees synced from Deel
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deelData.employees.length > 0 ? (
                  <div className="space-y-4">
                    {deelData.employees.map((employee, index) => (
                      <div key={employee.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{employee.name || 'Unknown Name'}</h4>
                          <p className="text-sm text-gray-600">{employee.email || 'No email provided'}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>Role: {employee.role || 'Not specified'}</span>
                            {employee.department && <span>Department: {employee.department}</span>}
                            {employee.manager && <span>Manager: {employee.manager}</span>}
                            {employee.startDate && (
                              <span>Start: {new Date(employee.startDate).toLocaleDateString()}</span>
                            )}
                          </div>
                          {employee.companyName && (
                            <p className="text-sm text-blue-600 mt-1">Company: {employee.companyName}</p>
                          )}
                          {employee.directReports && employee.directReports > 0 && (
                            <p className="text-sm text-green-600 mt-1">Manages {employee.directReports} direct reports</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className={
                            employee.status === 'active' ? 'bg-green-100 text-green-800' :
                            employee.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            employee.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {employee.status || 'Active'}
                          </Badge>
                          {employee.hiringType && (
                            <p className="text-xs text-gray-500 mt-1">{employee.hiringType}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Loaded</h3>
                    <p className="text-gray-500 mb-4">
                      Complete the Deel integration setup and sync data to view your employees here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract Management ({deelData.contracts.length} contracts)
                </CardTitle>
                <CardDescription>
                  View and manage contracts synced from Deel
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deelData.contracts.length > 0 ? (
                  <div className="space-y-4">
                    {deelData.contracts.map((contract, index) => (
                      <div key={contract.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{contract.title || contract.name || 'Unnamed Contract'}</h4>
                          <p className="text-sm text-gray-600">ID: {contract.id}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            {contract.status && <span>Status: {contract.status}</span>}
                            {contract.type && <span>Type: {contract.type}</span>}
                            {contract.start_date && (
                              <span>Start: {new Date(contract.start_date).toLocaleDateString()}</span>
                            )}
                            {contract.end_date && (
                              <span>End: {new Date(contract.end_date).toLocaleDateString()}</span>
                            )}
                          </div>
                          {contract.worker_name && (
                            <p className="text-sm text-blue-600 mt-1">Worker: {contract.worker_name}</p>
                          )}
                          {contract.payment?.rate && (
                            <p className="text-sm text-green-600 mt-1">
                              Rate: {contract.payment.currency} {contract.payment.rate.toLocaleString()}/{contract.payment.scale}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className={
                            contract.status === 'active' ? 'bg-green-100 text-green-800' :
                            contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            contract.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            contract.status === 'terminated' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {contract.status || 'Unknown'}
                          </Badge>
                          {contract.type && (
                            <p className="text-xs text-gray-500 mt-1">{contract.type}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Contracts Loaded</h3>
                    <p className="text-gray-500 mb-4">
                      Complete the Deel integration setup and sync data to view your contracts here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <ComplianceReview />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analytics & Insights
                </CardTitle>
                <CardDescription>
                  Data-driven insights from your HR compliance monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                  <p className="text-gray-500 mb-4">
                    Comprehensive analytics and insights will be available once data synchronization is complete.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}