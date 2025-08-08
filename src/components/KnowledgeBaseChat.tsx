import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ContextChunk {
  chunk_id: number;
  doc_id: string;
  doc_title: string | null;
  section_path: string | null;
  content: string;
  similarity: number;
}

interface QueryResult {
  success: boolean;
  query: string;
  context: ContextChunk[];
  response: string | null;
  metadata: {
    total_chunks_found: number;
    query_time: number;
    response_time: number;
    similarity_threshold: number;
  };
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: ContextChunk[];
  metadata?: QueryResult['metadata'];
}

const KnowledgeBaseChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState<Record<string, boolean>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: 'Hello! I\'m your compliance assistant. I can help you find information from your uploaded documents. What would you like to know?',
        timestamp: new Date()
      }]);
    }
  }, []);

  const performRAGQuery = async (query: string): Promise<QueryResult> => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://eufsshczsdzfxmlkbpey.supabase.co';
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 8,
        similarity_threshold: 0.2,
        include_response: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Query failed: ${response.statusText}`);
    }

    return response.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentQuery.trim() || isLoading) return;

    const userQuery = currentQuery.trim();
    setCurrentQuery('');
    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      type: 'user',
      content: userQuery,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await performRAGQuery(userQuery);

      // Add assistant response
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        type: 'assistant',
        content: result.response || 'I couldn\'t find relevant information to answer your question.',
        timestamp: new Date(),
        context: result.context,
        metadata: result.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('RAG query error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process your query');
      
      // Add error message
      const errorMessageId = `error-${Date.now()}`;
      const errorMessage: ChatMessage = {
        id: errorMessageId,
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your query. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleContext = (messageId: string) => {
    setShowContext(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-100 text-green-800';
    if (similarity >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Knowledge Base Chat</h2>
        </div>
        <p className="text-muted-foreground">
          Ask questions about your compliance documents and get AI-powered answers with source citations.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-4 mb-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <Card className={message.type === 'user' ? 'bg-blue-50 border-blue-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm">
                        {message.type === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    <div className="prose prose-sm max-w-none">
                      <p className="mb-0 whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Context Sources */}
                    {message.context && message.context.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <Collapsible>
                          <CollapsibleTrigger
                            onClick={() => toggleContext(message.id)}
                            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            <BookOpen className="h-4 w-4" />
                            View Sources ({message.context.length})
                            <ExternalLink className="h-3 w-3" />
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent className="mt-3">
                            <div className="space-y-3">
                              {message.context.map((chunk, index) => (
                                <Card key={chunk.chunk_id} className="bg-gray-50">
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-sm">
                                        Source {index + 1}
                                        {chunk.doc_title && (
                                          <span className="font-normal text-muted-foreground ml-2">
                                            • {chunk.doc_title}
                                          </span>
                                        )}
                                      </CardTitle>
                                      <Badge 
                                        variant="outline" 
                                        className={getSimilarityColor(chunk.similarity)}
                                      >
                                        {(chunk.similarity * 100).toFixed(0)}% match
                                      </Badge>
                                    </div>
                                    {chunk.section_path && (
                                      <CardDescription className="text-xs">
                                        {chunk.section_path}
                                      </CardDescription>
                                    )}
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    <p className="text-sm text-gray-700 line-clamp-3">
                                      {chunk.content}
                                    </p>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Query Metadata */}
                        {message.metadata && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            <div className="flex gap-4">
                              <span>Query: {message.metadata.query_time}ms</span>
                              <span>Response: {message.metadata.response_time}ms</span>
                              <span>Sources: {message.metadata.total_chunks_found}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="max-w-[80%]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Searching knowledge base...
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          placeholder="Ask a question about your compliance documents..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={!currentQuery.trim() || isLoading}
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Help Text */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        <p>
          Tip: Ask specific questions about policies, procedures, or compliance requirements. 
          The AI will search your uploaded documents and provide answers with source citations.
        </p>
      </div>
    </div>
  );
};

export default KnowledgeBaseChat;
