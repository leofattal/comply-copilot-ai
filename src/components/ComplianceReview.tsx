import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLatestComplianceReport, type ComplianceReport } from '@/lib/api';

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
  sources?: any[];
}

export default function ComplianceReview() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ComplianceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workersAnalyzed, setWorkersAnalyzed] = useState(0);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [usedRAG, setUsedRAG] = useState(false);
  const [ablation, setAblation] = useState(false);
  const [baseline, setBaseline] = useState<any | null>(null);
  const [diff, setDiff] = useState<{ only_in_rag: number; only_in_baseline: number } | null>(null);

  // Load existing compliance report on component mount
  useEffect(() => {
    loadComplianceReport();
  }, []);

  const loadComplianceReport = async () => {
    try {
      setIsLoadingReport(true);
      const report = await getLatestComplianceReport();
      if (report) {
        setComplianceReport(report);
        if (report.report_data) {
          const canonicalWorkers = report.total_workers || report.report_data?.summary?.totalWorkers || 0;
          const normalized = {
            ...report.report_data,
            summary: {
              ...report.report_data.summary,
              totalWorkers: canonicalWorkers,
            }
          } as any;
          setAnalysis(normalized);
          setWorkersAnalyzed(canonicalWorkers);
          setUsedRAG(Boolean((normalized as any)?.sources?.length));
        }
      }
    } catch (error) {
      setError('Failed to load existing compliance data');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const runComplianceAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Kick off RAG; prefer proxied result if available (includes baseline + diff)
      const { data: enqueueData, error: enqueueError } = await supabase.functions.invoke('rag-enqueue', {
        method: 'POST',
        body: { ablation }
      });

      if (enqueueError) {
        console.warn('RAG enqueue error:', enqueueError);
      }

      if (enqueueData?.success && enqueueData?.analysis) {
        setAnalysis(enqueueData.analysis);
        setWorkersAnalyzed(enqueueData.workersAnalyzed || enqueueData.analysis?.summary?.totalWorkers || 0);
        setUsedRAG(Boolean(enqueueData.usedRAG || enqueueData.analysis?.sources?.length));
        setBaseline(enqueueData?.baseline || null);
        setDiff(enqueueData?.diff || null);
        return; // We already have the full payload; skip DB polling
      }

      // Fallback: poll latest report saved to DB (no baseline/diff)
      const start = Date.now();
      const timeoutMs = 30_000;
      let data: any = null;
      while (Date.now() - start < timeoutMs) {
        const report = await getLatestComplianceReport();
        if (report && report.updated_at) {
          data = { success: true, analysis: report.report_data, workersAnalyzed: report.total_workers, usedRAG: true };
          break;
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      if (!data?.success) {
        throw new Error('Analysis failed');
      }

      setAnalysis(data.analysis);
      setWorkersAnalyzed(data.workersAnalyzed);
      setUsedRAG(Boolean(data?.usedRAG || data?.analysis?.sources?.length));
      setBaseline(null);
      setDiff(null);

    } catch (error) {
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
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Wage & Hour Compliance Review</h2>
            {usedRAG && (
              <Badge variant="outline">RAG powered</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            AI-powered analysis of wage and hour compliance across your workforce
          </p>
          {complianceReport && (
            <p className="text-sm text-gray-500 mt-1">
              Last analysis: {new Date(complianceReport.updated_at || complianceReport.created_at).toLocaleDateString()} 
              {(complianceReport.report_data?.summary?.totalWorkers || complianceReport.total_workers) && ` • ${complianceReport.report_data?.summary?.totalWorkers || complianceReport.total_workers} workers analyzed`}
              {complianceReport.risk_score !== null && ` • Risk score: ${complianceReport.risk_score}`}
            </p>
          )}
        </div>
        <Button 
          onClick={runComplianceAnalysis} 
          disabled={isAnalyzing || isLoadingReport}
          className="min-w-[160px]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : isLoadingReport ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : complianceReport ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Analysis
            </>
          ) : (
            <>
              <DollarSign className="mr-2 h-4 w-4" />
              Run Analysis
            </>
          )}
        </Button>
        <div className="ml-4 flex items-center gap-2">
          <input id="ablation-toggle" type="checkbox" checked={ablation} onChange={(e) => setAblation(e.target.checked)} />
          <label htmlFor="ablation-toggle" className="text-sm text-muted-foreground">Run ablation (no context) for comparison</label>
        </div>
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
                  {analysis.recommendations.map((rec: any, index) => {
                    if (typeof rec === 'string') {
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <p className="text-sm">{rec}</p>
                        </div>
                      );
                    }
                    const recommendation = rec as any;
                    return (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{recommendation.title}</h4>
                          {recommendation.priority && (
                            <Badge variant={getSeverityColor(recommendation.priority)}>
                              {recommendation.priority}
                            </Badge>
                          )}
                        </div>
                        {typeof recommendation.affectedWorkers === 'number' && (
                          <p className="text-sm text-muted-foreground">
                            Affects {recommendation.affectedWorkers} workers
                          </p>
                        )}
                        {recommendation.implementation && (
                          <p className="text-sm">{recommendation.implementation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sources used for this analysis (RAG) */}
          {analysis.sources && analysis.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sources</CardTitle>
                <CardDescription>
                  Authoritative passages retrieved from your uploaded documents. Indices match the [n] citations above.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.sources.map((src: any) => (
                    <div id={`source-${src.index}`} key={src.index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">[{src.index}] {src.title || 'Untitled document'}</div>
                        {typeof src.similarity === 'number' && (
                          <Badge variant="outline">{Math.round(src.similarity * 100)}% match</Badge>
                        )}
                      </div>
                      {src.section_path && (
                        <p className="text-xs text-muted-foreground mb-2">{src.section_path}</p>
                      )}
                      {src.snippet && (
                        <blockquote className="text-sm italic text-gray-700 border-l-2 pl-3">
                          “{src.snippet}”
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Baseline (Ablation) Results */}
          {baseline && (
            <Card>
              <CardHeader>
                <CardTitle>Baseline (no context)</CardTitle>
                <CardDescription>
                  Model-only assessment without retrieved sources. Use this to compare how much RAG adds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {diff && (
                  <div className="mb-3 text-xs text-muted-foreground">
                    <span className="mr-4">Only in RAG: {diff.only_in_rag}</span>
                    <span>Only in baseline: {diff.only_in_baseline}</span>
                  </div>
                )}
                {Array.isArray(baseline.violations) && baseline.violations.length > 0 ? (
                  <div className="space-y-4">
                    {baseline.violations.map((v: any, i: number) => (
                      <div key={i} className="border rounded-lg p-4 space-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{v.title}</h4>
                            <p className="text-sm text-muted-foreground">{v.workerName} • {v.jurisdiction}</p>
                          </div>
                          <Badge variant={getSeverityColor(v.severity || 'high')}>{v.severity || 'high'}</Badge>
                        </div>
                        <p className="text-sm">{v.description}</p>
                        {v.currentRate && v.requiredRate && (
                          <div className="flex items-center gap-4 text-sm">
                            <span>Current: ${v.currentRate}/hr</span>
                            <span>Required: ${v.requiredRate}/hr</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No baseline violations.</div>
                )}
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