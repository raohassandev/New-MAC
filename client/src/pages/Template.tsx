import { CreditCard, Edit, FileText, Plus, Search, Trash, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NewTemplateForm from '../components/devices/NewTemplateForm/index';
import { useDevices } from '../hooks/useDevices';
import { Button } from '../components/ui/Button';

interface Template {
  id: string;
  name: string;
  description: string;
  deviceType: string;
  registerCount: number;
  createdAt: string;
  updatedAt: string;
}

const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTemplateFormOpen, setIsNewTemplateFormOpen] = useState(false);
  
  // Get devices functions from useDevices hook
  const { addDevice, refreshDevices } = useDevices();

  // Define fetchTemplates function outside useEffect so it can be called elsewhere
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock template data
      const mockTemplates: Template[] = [
        {
          id: '1',
          name: 'Energy Analyzer Template',
          description:
            'Standard template for energy analyzer devices with voltage, current, and power readings',
          deviceType: 'Energy Analyzer',
          registerCount: 12,
          createdAt: '2024-03-15T09:00:00Z',
          updatedAt: '2024-04-10T14:23:00Z',
        },
        {
          id: '2',
          name: 'HVAC Controller Template',
          description:
            'Template for HVAC controllers with temperature, humidity, and fan control registers',
          deviceType: 'HVAC Controller',
          registerCount: 8,
          createdAt: '2024-03-20T11:30:00Z',
          updatedAt: '2024-04-12T09:45:00Z',
        },
        {
          id: '3',
          name: 'Temperature Sensor Template',
          description: 'Basic template for temperature monitoring devices',
          deviceType: 'Sensor',
          registerCount: 4,
          createdAt: '2024-03-25T15:20:00Z',
          updatedAt: '2024-04-05T10:15:00Z',
        },
        {
          id: '4',
          name: 'Water Level Controller Template',
          description:
            'Template for water level controllers with level, flow, and pump control registers',
          deviceType: 'Level Controller',
          registerCount: 6,
          createdAt: '2024-04-02T08:40:00Z',
          updatedAt: '2024-04-15T16:30:00Z',
        },
      ];

      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddTemplate = () => {
    setCurrentTemplate(null);
    setIsNewTemplateFormOpen(true);
  };
  
  // Add handler functions for template form
  const onNewTemplateFormSubmit = async (templateData: any) => {
    console.log('Submitting template data:', templateData);
    try {
      await addDevice(templateData);
      await refreshDevices();
      setIsNewTemplateFormOpen(false);
      // Refresh the templates list
      fetchTemplates();
    } catch (error) {
      console.error('Error adding template:', error);
    }
  };

  const onNewTemplateFormClose = () => {
    console.log('Closing template form');
    setIsNewTemplateFormOpen(false);
  };

  const handleEditTemplate = (template: Template) => {
    // For now, just navigate to the device detail page
    // We'll implement proper template editing in the future
    navigate(`/devices/${template.id}`);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      // In a real app, this would be an API call
      setTemplates(templates.filter(template => template.id !== id));
    }
  };

  const handleDuplicateTemplate = (template: Template) => {
    const newTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTemplates([...templates, newTemplate]);
  };

  const filteredTemplates = templates.filter(
    template =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.deviceType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Device Templates</h1>
        <Button
          variant="default"
          onClick={handleAddTemplate}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add New Template
        </Button>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse p-8 text-center text-gray-500">
          <FileText className="mx-auto mb-4" size={32} />
          <p>Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <FileText className="mx-auto mb-4 text-gray-400" size={32} />
          <h3 className="mb-2 text-lg font-medium text-gray-900">No templates found</h3>
          <p className="mb-4 text-gray-500">
            {searchQuery
              ? 'No templates match your search criteria. Try adjusting your search.'
              : "You haven't created any device templates yet."}
          </p>
          {!searchQuery && (
            <Button
              variant="default"
              onClick={handleAddTemplate}
              className="inline-flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Create your first template
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Template Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Device Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Registers
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Last Updated
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredTemplates.map(template => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 flex-shrink-0 text-gray-400" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{template.name}</div>
                          <div className="max-w-xs truncate text-sm text-gray-500">
                            {template.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                        {template.deviceType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {template.registerCount} registers
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(template.updatedAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="mr-3 text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template)}
                        className="mr-3 text-blue-600 hover:text-blue-900"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      {isNewTemplateFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50" onClick={(e) => {
          // Close modal when clicking the overlay (background)
          if (e.target === e.currentTarget) {
            console.log('Modal background clicked, closing modal');
            onNewTemplateFormClose();
          }
        }}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-xl font-semibold">Add New Template</h2>
              <button
                onClick={() => {
                  console.log('Close button clicked');
                  onNewTemplateFormClose();
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <NewTemplateForm onClose={onNewTemplateFormClose} onSubmit={onNewTemplateFormSubmit} />
            </div>
          </div>
        </div>
      )}

      {/* Edit template modal would go here */}
    </div>
  );
};
2
export default TemplatesPage;
function setCurrentTemplate(arg0: null) {
  throw new Error('Function not implemented.');
}

