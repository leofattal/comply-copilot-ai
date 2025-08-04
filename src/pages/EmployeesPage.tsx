import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  Mail,
  Calendar,
  Building
} from 'lucide-react';
import { useDeelData } from '@/hooks/useDeelData';
import { type DeelEmployee } from '@/lib/api';

export default function EmployeesPage() {
  const { employees, loading, error, loadData } = useDeelData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Load data when component mounts
  useEffect(() => {
    loadData();
  }, [loadData]);

  // employees is already available from the hook

  // Filter employees based on search and status
  const filteredEmployees = employees.filter((employee: DeelEmployee) => {
    const matchesSearch = !searchTerm || 
      employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || employee.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'in_progress': return 'outline';
      default: return 'secondary';
    }
  };

  const getUniqueStatuses = () => {
    const statuses = employees.map((emp: DeelEmployee) => emp.status).filter(Boolean);
    return ['all', ...Array.from(new Set(statuses))];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employees</h1>
            <p className="text-muted-foreground">Manage your workforce data</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Employees</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => loadData()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            Manage your workforce data ({filteredEmployees.length} employees)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-3xl font-bold">{employees.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-3xl font-bold">
                  {employees.filter((emp: DeelEmployee) => emp.status === 'active').length}
                </p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold">
                  {employees.filter((emp: DeelEmployee) => emp.status === 'pending').length}
                </p>
              </div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-3xl font-bold">
                  {new Set(employees.map((emp: DeelEmployee) => emp.department).filter(Boolean)).size}
                </p>
              </div>
              <Building className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getUniqueStatuses().map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>
            Complete list of employees synced from your HR system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length > 0 ? (
            <div className="space-y-4">
              {filteredEmployees.map((employee: DeelEmployee, index: number) => (
                <div 
                  key={employee.id || index} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {employee.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    
                    {/* Employee Info */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {employee.name || 'Unknown Name'}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {employee.email || 'No email'}
                        </div>
                        {employee.role && (
                          <span>Role: {employee.role}</span>
                        )}
                        {employee.department && (
                          <span>Dept: {employee.department}</span>
                        )}
                      </div>
                      {employee.startDate && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Calendar className="w-3 h-3" />
                          Started: {new Date(employee.startDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center space-x-3">
                    <Badge variant={getStatusVariant(employee.status || 'unknown')}>
                      {employee.status || 'Unknown'}
                    </Badge>
                    {employee.hiringType && (
                      <Badge variant="outline">
                        {employee.hiringType}
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedStatus !== 'all' ? 'No Matching Employees' : 'No Employees Found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Connect your HR system to start importing employee data.'
                }
              </p>
              {(!searchTerm && selectedStatus === 'all') && (
                <Button onClick={() => loadData()}>Refresh Data</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}