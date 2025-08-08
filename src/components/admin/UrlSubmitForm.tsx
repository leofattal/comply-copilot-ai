import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link2, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const urlSubmissionSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
});

type UrlSubmissionForm = z.infer<typeof urlSubmissionSchema>;

interface SubmittedUrl {
  id: string;
  url: string;
  title: string;
  description?: string;
  status: 'submitting' | 'success' | 'error';
  timestamp: Date;
  error?: string;
}

const UrlSubmitForm: React.FC = () => {
  const [submittedUrls, setSubmittedUrls] = useState<SubmittedUrl[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<UrlSubmissionForm>({
    resolver: zodResolver(urlSubmissionSchema),
  });

  const url = watch('url');

  const generateTitleFromUrl = () => {
    if (!url) return;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const pathname = urlObj.pathname.split('/').filter(Boolean).join(' ');
      const suggestedTitle = `${hostname} ${pathname}`.trim() || hostname;
      
      // Set the title if it's currently empty
      const titleInput = document.querySelector('[name="title"]') as HTMLInputElement;
      if (titleInput && !titleInput.value) {
        titleInput.value = suggestedTitle;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      console.error('Invalid URL for title generation:', error);
    }
  };

  const onSubmit = async (data: UrlSubmissionForm) => {
    setIsSubmitting(true);
    
    const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSubmission: SubmittedUrl = {
      id: submissionId,
      url: data.url,
      title: data.title,
      description: data.description,
      status: 'submitting',
      timestamp: new Date(),
    };

    setSubmittedUrls(prev => [newSubmission, ...prev]);

    try {
      const { submitUrl } = await import('@/lib/adminApi');
      const result = await submitUrl(data);
      console.log('URL submission successful:', result);

      setSubmittedUrls(prev => 
        prev.map(item => 
          item.id === submissionId 
            ? { ...item, status: 'success' }
            : item
        )
      );

      reset(); // Clear the form
      
    } catch (error) {
      console.error('URL submission error:', error);
      
      setSubmittedUrls(prev => 
        prev.map(item => 
          item.id === submissionId 
            ? { 
                ...item, 
                status: 'error',
                error: error instanceof Error ? error.message : 'Submission failed'
              }
            : item
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: SubmittedUrl['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'submitting':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />;
    }
  };

  const getStatusBadge = (status: SubmittedUrl['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Submitted</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      case 'submitting':
        return <Badge className="bg-blue-100 text-blue-700">Processing</Badge>;
    }
  };

  const removeSubmission = (id: string) => {
    setSubmittedUrls(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Submission Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">URL *</Label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                {...register('url')}
                placeholder="https://example.com/compliance-document"
                className="pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={generateTitleFromUrl}
              disabled={!url || !!errors.url}
            >
              Auto-title
            </Button>
          </div>
          {errors.url && (
            <p className="text-sm text-red-600">{errors.url.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Descriptive title for the document"
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Brief description of the content and its relevance"
            rows={3}
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Submitting URL...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-2" />
              Submit URL
            </>
          )}
        </Button>
      </form>

      {/* Submission History */}
      {submittedUrls.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Recent Submissions</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSubmittedUrls(prev => prev.filter(item => item.status === 'submitting'))}
            >
              Clear Completed
            </Button>
          </div>

          <div className="space-y-3">
            {submittedUrls.slice(0, 10).map((submission) => (
              <Card key={submission.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(submission.status)}
                      <CardTitle className="text-base">{submission.title}</CardTitle>
                      {getStatusBadge(submission.status)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubmission(submission.id)}
                      disabled={submission.status === 'submitting'}
                    >
                      ×
                    </Button>
                  </div>
                  {submission.description && (
                    <CardDescription>{submission.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link2 className="h-3 w-3" />
                    <a 
                      href={submission.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline truncate flex-1"
                    >
                      {submission.url}
                    </a>
                    <span>•</span>
                    <span>{submission.timestamp.toLocaleTimeString()}</span>
                  </div>
                  
                  {submission.error && (
                    <Alert className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {submission.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlSubmitForm;
