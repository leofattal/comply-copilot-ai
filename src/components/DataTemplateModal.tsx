import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Download, 
  FileText, 
  Users, 
  X,
  CheckCircle
} from 'lucide-react';

interface DataTemplate {
  id: string;
  name: string;
  description: string;
  fields: string[];
  exampleData: string;
  fileType: 'csv' | 'xlsx';
}

const dataTemplates: DataTemplate[] = [
  {
    id: 'employees',
    name: 'Employee Data Template',
    description: 'Required employee information for compliance analysis',
    fields: [
      'Employee ID',
      'Full Name', 
      'Email',
      'Job Title',
      'Department',
      'Location (State/Country)',
      'Employment Type (Full-time/Part-time/Contractor)',
      'Start Date',
      'Hourly Rate/Salary',
      'Currency',
      'Working Hours per Week',
      'Manager Name',
      'Status (Active/Inactive)'
    ],
    exampleData: `Employee ID,Full Name,Email,Job Title,Department,Location,Employment Type,Start Date,Hourly Rate,Currency,Working Hours,Manager,Status
EMP001,John Smith,john.smith@company.com,Software Engineer,Engineering,CA,Full-time,2023-01-15,45.00,USD,40,Jane Doe,Active
EMP002,Sarah Johnson,sarah.j@company.com,HR Manager,Human Resources,NY,Full-time,2022-06-01,65000,USD,40,John Manager,Active`,
    fileType: 'csv'
  },
  {
    id: 'contracts',
    name: 'Contract Data Template',
    description: 'Contract and compensation information',
    fields: [
      'Contract ID',
      'Employee ID',
      'Contract Type',
      'Start Date',
      'End Date',
      'Base Salary/Amount',
      'Currency',
      'Payment Frequency',
      'Benefits Included',
      'Overtime Eligible',
      'Contract Status'
    ],
    exampleData: `Contract ID,Employee ID,Contract Type,Start Date,End Date,Base Amount,Currency,Payment Frequency,Benefits,Overtime Eligible,Status
CON001,EMP001,Employment,2023-01-15,,93600,USD,Annual,Yes,Yes,Active
CON002,EMP002,Employment,2022-06-01,,65000,USD,Annual,Yes,Yes,Active`,
    fileType: 'csv'
  }
];

interface DataTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadTemplate: (template: DataTemplate) => void;
}

export default function DataTemplateModal({ isOpen, onClose, onDownloadTemplate }: DataTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DataTemplate | null>(null);

  const handleDownload = (template: DataTemplate) => {
    // Create and download the template file
    const blob = new Blob([template.exampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    onDownloadTemplate(template);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Data Templates</span>
          </DialogTitle>
          <DialogDescription>
            Download these templates to format your data correctly for compliance analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {dataTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      {template.id === 'employees' ? (
                        <Users className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-green-600" />
                      )}
                      <span>{template.name}</span>
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{template.fileType.toUpperCase()}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Required Fields:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {template.fields.map((field, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>{field}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Example Data:</h4>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {template.exampleData}
                  </pre>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleDownload(template)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Tips for Data Upload:</h4>
            <ul className="text-sm space-y-1">
              <li>• Ensure all required fields are included</li>
              <li>• Use consistent date formats (YYYY-MM-DD)</li>
              <li>• Include currency codes for all monetary values</li>
              <li>• Verify employee IDs match between files</li>
              <li>• Remove any sensitive personal information</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 