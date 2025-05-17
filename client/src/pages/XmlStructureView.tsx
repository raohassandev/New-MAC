import React, { useEffect, useState } from 'react';
import XmlViewer from '../components/ui/XmlViewer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const XmlStructureView: React.FC = () => {
  const [xmlContent, setXmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchXmlContent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/project_structure.xml');

        if (!response.ok) {
          throw new Error(`Failed to fetch XML: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        setXmlContent(content);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Error fetching XML:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchXmlContent();
  }, []);

  return (
    // <MainLayout>
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Project Structure</h1>

      {isLoading ? (
        <Card>
          <div className="flex items-center justify-center p-6">
            <div className="animate-pulse text-lg">Loading XML structure...</div>
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="p-6">
            <h3 className="mb-2 text-xl font-medium text-red-600">Error Loading XML</h3>
            <p className="text-gray-700">{error}</p>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        </Card>
      ) : (
        <XmlViewer xmlContent={xmlContent} title="Project Structure XML" expandAll={false} />
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>
          This view shows the XML representation of the project structure. You can expand/collapse
          nodes to explore the project hierarchy.
        </p>
      </div>
    </div>
    // </MainLayout>
  );
};

export default XmlStructureView;
