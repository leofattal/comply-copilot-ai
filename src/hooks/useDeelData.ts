import { useState, useCallback } from 'react';
import { 
  getDeelEmployees, 
  getDeelContracts,
  getLatestComplianceReport,
  type DeelEmployee,
  type DeelContract,
  type ComplianceReport 
} from '@/lib/api';

interface DeelData {
  employees: DeelEmployee[];
  contracts: DeelContract[];
  loading: boolean;
  error: string | null;
  lastSync: string | null;
  complianceReport: ComplianceReport | null;
}

export function useDeelData() {
  const [data, setData] = useState<DeelData>({
    employees: [],
    contracts: [],
    loading: false,
    error: null,
    lastSync: null,
    complianceReport: null,
  });

  const loadData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('📊 Loading basic data in useDeelData...');
      const [employeesData, contractsData, complianceReport] = await Promise.all([
        getDeelEmployees(),
        getDeelContracts(),
        getLatestComplianceReport()
      ]);

      console.log('📋 Basic compliance report info loaded:', complianceReport ? {
        id: complianceReport.id,
        created_at: complianceReport.created_at,
        critical_issues: complianceReport.critical_issues
      } : 'No report found');

      setData({
        employees: employeesData,
        contracts: contractsData,
        loading: false,
        error: null,
        lastSync: new Date().toISOString(),
        complianceReport,
      });
      console.log('✅ Basic data updated successfully');
    } catch (error) {
      console.error('❌ Failed to load data:', error);
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
      loading: false,
      error: null,
      lastSync: null,
      complianceReport: null,
    });
  }, []);

  return {
    ...data,
    loadData,
    clearData,
  };
}