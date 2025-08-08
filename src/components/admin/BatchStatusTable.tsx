import React, { useEffect, useState } from 'react';
import { RefreshCw, Eye, Trash2, AlertCircle, CheckCircle, Clock, FileText, Link, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DocumentStatus {
  doc_id: string;
  uri: string;
  title: string | null;
  uploaded_by: string | null;
  status: 'pending' | 'ready' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
  chunk_count?: number;
  total_tokens?: number;
}

interface DocumentChunk {
  chunk_id: number;
  section_path: string | null;
  content: string;
  tokens: number | null;
  created_at: string;
}

const BatchStatusTable: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentStatus | null>(null);
  const [docChunks, setDocChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const fetchDocuments = async () => {
    try {
      setRefreshing(true);
      const { getIngestStatus } = await import('@/lib/adminApi');
      const data = await getIngestStatus();
      setDocuments(data.documents || []);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDocumentChunks = async (docId: string) => {
    try {
      setLoadingChunks(true);
      const { getDocumentChunks } = await import('@/lib/adminApi');
      const data = await getDocumentChunks(docId);
      setDocChunks(data.chunks || []);
      
    } catch (err) {
      console.error('Error fetching document chunks:', err);
      setDocChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document and all its chunks?')) {
      return;
    }

    try {
      const { deleteDocument: deleteDocumentApi } = await import('@/lib/adminApi');
      await deleteDocumentApi(docId);

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.doc_id !== docId));
      
    } catch (err) {
      console.error('Error deleting document:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const processDocument = async (docId: string) => {
    try {
      const { processDocument: processDocumentApi } = await import('@/lib/adminApi');
      
      // Update status to show processing
      setDocuments(prev => prev.map(doc => 
        doc.doc_id === docId 
          ? { ...doc, status: 'pending' as const }
          : doc
      ));

      const result = await processDocumentApi(docId);
      console.log('Document processing result:', result);

      // Refresh documents to get updated status
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
      
    } catch (err) {
      console.error('Error processing document:', err);
      alert(err instanceof Error ? err.message : 'Failed to process document');
      
      // Refresh documents to get current status
      fetchDocuments();
    }
  };

  useEffect(() => {
    fetchDocuments();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDocuments, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: DocumentStatus['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus['status']) => {
    switch (status) {
      case 'ready':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Processing</Badge>;
    }
  };

  const getSourceIcon = (uri: string) => {
    return uri.startsWith('http') ? (
      <Link className="h-4 w-4 text-blue-600" />
    ) : (
      <FileText className="h-4 w-4 text-gray-600" />
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatUri = (uri: string) => {
    if (uri.startsWith('http')) {
      return uri.length > 50 ? `${uri.substring(0, 47)}...` : uri;
    }
    return uri.split('/').pop() || uri;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDocuments}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Documents ({documents.length})</h3>
          <p className="text-sm text-muted-foreground">
            Processing status for uploaded files and URLs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Documents table */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No documents found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload files or submit URLs to see them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.doc_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        {getStatusBadge(doc.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.title || 'Untitled'}</p>
                        {doc.error_message && (
                          <p className="text-sm text-red-600 mt-1">{doc.error_message}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSourceIcon(doc.uri)}
                        <span className="text-sm text-muted-foreground">
                          {formatUri(doc.uri)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {doc.chunk_count ? (
                          <span>{doc.chunk_count} chunks</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {doc.total_tokens && (
                          <div className="text-xs text-muted-foreground">
                            {doc.total_tokens.toLocaleString()} tokens
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(doc.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {doc.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processDocument(doc.doc_id)}
                            title="Process document"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDoc(doc);
                                if (doc.status === 'ready') {
                                  fetchDocumentChunks(doc.doc_id);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {getSourceIcon(selectedDoc?.uri || '')}
                                {selectedDoc?.title || 'Document Details'}
                              </DialogTitle>
                              <DialogDescription>
                                Document processing details and chunks
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedDoc && (
                              <Tabs defaultValue="details" className="mt-4">
                                <TabsList>
                                  <TabsTrigger value="details">Details</TabsTrigger>
                                  {selectedDoc.status === 'ready' && (
                                    <TabsTrigger value="chunks">Chunks</TabsTrigger>
                                  )}
                                </TabsList>
                                
                                <TabsContent value="details" className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Status</label>
                                      <div className="mt-1">{getStatusBadge(selectedDoc.status)}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Source</label>
                                      <p className="text-sm text-muted-foreground mt-1 break-all">
                                        {selectedDoc.uri}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Created</label>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {formatTimestamp(selectedDoc.created_at)}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Updated</label>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {formatTimestamp(selectedDoc.updated_at)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {selectedDoc.error_message && (
                                    <Alert>
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertDescription>
                                        {selectedDoc.error_message}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </TabsContent>
                                
                                {selectedDoc.status === 'ready' && (
                                  <TabsContent value="chunks">
                                    <ScrollArea className="h-[400px]">
                                      {loadingChunks ? (
                                        <div className="flex items-center justify-center py-8">
                                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        </div>
                                      ) : (
                                        <div className="space-y-4">
                                          {docChunks.map((chunk) => (
                                            <Card key={chunk.chunk_id}>
                                              <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                  <CardTitle className="text-sm">
                                                    Chunk #{chunk.chunk_id}
                                                    {chunk.section_path && (
                                                      <span className="font-normal text-muted-foreground ml-2">
                                                        • {chunk.section_path}
                                                      </span>
                                                    )}
                                                  </CardTitle>
                                                  {chunk.tokens && (
                                                    <Badge variant="outline" className="text-xs">
                                                      {chunk.tokens} tokens
                                                    </Badge>
                                                  )}
                                                </div>
                                              </CardHeader>
                                              <CardContent className="pt-0">
                                                <p className="text-sm text-muted-foreground line-clamp-3">
                                                  {chunk.content}
                                                </p>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      )}
                                    </ScrollArea>
                                  </TabsContent>
                                )}
                              </Tabs>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument(doc.doc_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchStatusTable;
