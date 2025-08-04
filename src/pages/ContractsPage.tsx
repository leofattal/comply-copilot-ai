import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  Calendar,
  DollarSign,
  User
} from 'lucide-react';
import { useDeelData } from '@/hooks/useDeelData';
import { type DeelContract } from '@/lib/api';

export default function ContractsPage() {
  const { contracts, loading, error, loadData } = useDeelData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Load data when component mounts
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter contracts based on search and status
  const filteredContracts = contracts.filter((contract: DeelContract) => {
    const matchesSearch = !searchTerm || 
      contract.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.id?.toString().includes(searchTerm);
    
    const matchesStatus = selectedStatus === 'all' || contract.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'in_progress': return 'outline';
      case 'terminated': return 'destructive';
      default: return 'secondary';
    }
  };

  const getUniqueStatuses = () => {
    const statuses = contracts.map((contract: DeelContract) => contract.status).filter(Boolean);
    return ['all', ...Array.from(new Set(statuses))];
  };

  const getTypeVariant = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'full-time': return 'default';
      case 'part-time': return 'secondary';
      case 'contractor': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contracts</h1>
            <p className="text-muted-foreground">Manage your contract data</p>
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
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Contracts</h3>
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
          <h1 className="text-3xl font-bold">Contracts</h1>
          <p className="text-muted-foreground">
            Manage your contract data ({filteredContracts.length} contracts)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Contract
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contracts</p>
                <p className="text-3xl font-bold">{contracts.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-3xl font-bold">
                  {contracts.filter((contract: DeelContract) => contract.status === 'active').length}
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
                  {contracts.filter((contract: DeelContract) => contract.status === 'pending').length}
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
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-3xl font-bold">
                  {contracts.reduce((total: number, contract: DeelContract) => {
                    return total + (contract.payment?.rate || 0);
                  }, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
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
                  placeholder="Search contracts by title, worker, or ID..."
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

      {/* Contract List */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Directory</CardTitle>
          <CardDescription>
            Complete list of contracts synced from your HR system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContracts.length > 0 ? (
            <div className="space-y-4">
              {filteredContracts.map((contract: DeelContract, index: number) => (
                <div 
                  key={contract.id || index} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Contract Icon */}
                    <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center text-white">
                      <FileText className="w-6 h-6" />
                    </div>
                    
                    {/* Contract Info */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {contract.title || contract.name || `Contract ${contract.id}`}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {contract.worker_name && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {contract.worker_name}
                          </div>
                        )}
                        <span>ID: {contract.id}</span>
                        {contract.type && (
                          <span>Type: {contract.type}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        {contract.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Start: {new Date(contract.start_date).toLocaleDateString()}
                          </div>
                        )}
                        {contract.end_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            End: {new Date(contract.end_date).toLocaleDateString()}
                          </div>
                        )}
                        {contract.payment?.rate && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {contract.payment.currency} {contract.payment.rate.toLocaleString()}/{contract.payment.scale}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center space-x-3">
                    <Badge variant={getStatusVariant(contract.status || 'unknown')}>
                      {contract.status || 'Unknown'}
                    </Badge>
                    {contract.type && (
                      <Badge variant={getTypeVariant(contract.type)}>
                        {contract.type}
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
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedStatus !== 'all' ? 'No Matching Contracts' : 'No Contracts Found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Connect your HR system to start importing contract data.'
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