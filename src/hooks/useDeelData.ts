import { useState, useCallback } from 'react';
import { 
  getDeelEmployees, 
  getDeelContracts,
  type DeelEmployee,
  type DeelContract,
  type DeelComplianceAlert 
} from '@/lib/api';

interface DeelData {
  employees: DeelEmployee[];
  contracts: DeelContract[];
  alerts: DeelComplianceAlert[];
  loading: boolean;
  error: string | null;
  lastSync: string | null;
}

export function useDeelData() {
  const [data, setData] = useState<DeelData>({
    employees: [],
    contracts: [],
    alerts: [],
    loading: false,
    error: null,
    lastSync: null,
  });

  const loadData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [employeesData, contractsData] = await Promise.all([
        getDeelEmployees(),
        getDeelContracts()
      ]);

      // Sample compliance alerts for now
      const sampleAlerts = employeesData.length > 0 ? [
        {
          id: 'alert-1',
          severity: 'medium' as const,
          title: 'Contract Review Due',
          description: 'Some contracts are approaching renewal dates',
          recommended_action: 'Review and update contract terms before expiration'
        },
        {
          id: 'alert-2', 
          severity: 'low' as const,
          title: 'Documentation Complete',
          description: 'All required employee documentation is up to date',
          recommended_action: 'Continue regular monitoring'
        }
      ] : [];

      setData({
        employees: employeesData,
        contracts: contractsData,
        alerts: sampleAlerts,
        loading: false,
        error: null,
        lastSync: new Date().toISOString(),
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  }, []);

  const clearData = useCallback(() => {
    setData({
      employees: [],
      contracts: [],
      alerts: [],
      loading: false,
      error: null,
      lastSync: null,
    });
  }, []);

  return {
    ...data,
    loadData,
    clearData,
  };
}