import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isCurrentUserAdmin } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Link, Database, Settings } from 'lucide-react';
import FileDropZone from '@/components/admin/FileDropZone';
import UrlSubmitForm from '@/components/admin/UrlSubmitForm';
import BatchStatusTable from '@/components/admin/BatchStatusTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AdminPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await isCurrentUserAdmin();
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setCheckingAdmin(false);
    };

    if (!loading) {
      checkAdminStatus();
    }
  }, [user, loading]);

  // Show loading state while checking auth and admin status
  if (loading || checkingAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking admin access...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-lg mx-auto">
          <Settings className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access the admin panel. Admin privileges are required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Badge variant="secondary" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Administrator
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage document uploads and RAG pipeline for compliance content
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            URL Submission
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Ingestion Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Document Upload
              </CardTitle>
              <CardDescription>
                Upload PDF, DOCX, or HTML files for processing and RAG ingestion.
                Files will be automatically processed and vectorized using Gemini embeddings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropZone />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                URL Submission
              </CardTitle>
              <CardDescription>
                Submit public URLs for content extraction and processing.
                The system will fetch the content and process it for RAG.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UrlSubmitForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Processing Status
              </CardTitle>
              <CardDescription>
                Monitor the status of uploaded documents and URL submissions.
                Track processing progress and identify any errors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatchStatusTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
