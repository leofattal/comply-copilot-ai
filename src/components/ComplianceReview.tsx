import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ComplianceSummary {
  overallRiskScore: number;
  criticalIssues: number;
  totalWorkers: number;
  complianceRate: number;
}

interface ComplianceViolation {
  workerId: string;
  workerName: string;
  violationType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  jurisdiction: string;
  currentRate?: number;
  requiredRate?: number;
  recommendedActions: string[];
}

interface ComplianceRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  affectedWorkers: number;
  implementation: string;
}

interface ComplianceAnalysis {
  summary: ComplianceSummary;
  violations: ComplianceViolation[];
  recommendations: ComplianceRecommendation[];
}

export default function ComplianceReview() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ComplianceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workersAnalyzed, setWorkersAnalyzed] = useState(0);

  const runComplianceAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('🔄 Starting compliance analysis...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error: functionError } = await supabase.functions.invoke('compliance-review', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (functionError) {
        throw new Error(`Compliance analysis failed: ${functionError.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      console.log('✅ Compliance analysis completed:', data);
      setAnalysis(data.analysis);
      setWorkersAnalyzed(data.workersAnalyzed);

    } catch (error) {
      console.error('❌ Compliance analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wage & Hour Compliance Review</h2>
          <p className="text-muted-foreground">
            AI-powered analysis of wage and hour compliance across your workforce
          </p>
        </div>
        <Button 
          onClick={runComplianceAnalysis} 
          disabled={isAnalyzing}
          className="min-w-[160px]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <DollarSign className="mr-2 h-4 w-4" />
              Run Analysis
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                    <p className="text-2xl font-bold">{analysis.summary.overallRiskScore}/100</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                    <p className="text-2xl font-bold">{analysis.summary.criticalIssues}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                    <p className="text-2xl font-bold">{Math.round(analysis.summary.complianceRate)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Workers Analyzed</p>
                    <p className="text-2xl font-bold">{workersAnalyzed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Violations */}
          {analysis.violations && analysis.violations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Compliance Violations</span>
                </CardTitle>
                <CardDescription>
                  Critical wage and hour compliance issues requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.violations.map((violation, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(violation.severity)}
                          <div>
                            <h4 className="font-semibold">{violation.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {violation.workerName} • {violation.jurisdiction}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getSeverityColor(violation.severity)}>
                          {violation.severity}
                        </Badge>
                      </div>
                      
                      <p className="text-sm">{violation.description}</p>
                      
                      {violation.currentRate && violation.requiredRate && (
                        <div className="flex items-center space-x-4 text-sm">
                          <span>Current: ${violation.currentRate}/hr</span>
                          <span>Required: ${violation.requiredRate}/hr</span>
                        </div>
                      )}
                      
                      {violation.recommendedActions && violation.recommendedActions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Recommended Actions:</p>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {violation.recommendedActions.map((action, actionIndex) => (
                              <li key={actionIndex}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Strategic Recommendations</CardTitle>
                <CardDescription>
                  Prioritized actions to improve wage and hour compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.recommendations.map((recommendation, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{recommendation.title}</h4>
                        <Badge variant={getSeverityColor(recommendation.priority)}>
                          {recommendation.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Affects {recommendation.affectedWorkers} workers
                      </p>
                      <p className="text-sm">{recommendation.implementation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Violations Found */}
          {(!analysis.violations || analysis.violations.length === 0) && (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Critical Violations Found</h3>
                <p className="text-muted-foreground">
                  Your workforce appears to be compliant with wage and hour regulations.
                  Continue monitoring for ongoing compliance.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial State */}
      {!analysis && !isAnalyzing && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready for Compliance Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run Analysis" to start an AI-powered review of your workforce's 
              wage and hour compliance using data from Deel.
            </p>
            <p className="text-sm text-muted-foreground">
              Analysis covers minimum wage, overtime rules, and payment frequency compliance
              across all jurisdictions where you have workers.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}