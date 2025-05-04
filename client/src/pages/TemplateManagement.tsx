import { CreditCard, Edit, FileText, Plus, Search, Trash, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NewTemplateForm from '../components/templates/index';
import { useTemplates } from '../hooks/useTemplates';
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

const TemplateManagement: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTemplateFormOpen, setIsNewTemplateFormOpen] = useState(false);
  
  // Get templates functions from useTemplates hook
  const { 
    templates: apiTemplates, 
    loading: apiLoading, 
    error: apiError, 
    addTemplate, 
    refreshTemplates,
    deleteTemplate
  } = useTemplates();

  // This will convert the API template format to our UI format
  const convertApiTemplates = useEffect(() => {
    if (apiTemplates) {
      // Map the API templates to our UI template format
      const mappedTemplates = apiTemplates.map(template => ({
        id: template._id || '',
        name: template.name || '',
        description: template.description || '',
        deviceType: template.deviceType || '',
        registerCount: template.dataPoints?.length || 0,
        createdAt: template.createdAt ? new Date(template.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: template.updatedAt ? new Date(template.updatedAt).toISOString() : new Date().toISOString(),
      }));
      
      setTemplates(mappedTemplates);
      setLoading(apiLoading);
    }
  }, [apiTemplates, apiLoading]);
  
  // Call the API to refresh templates
  const fetchTemplates = async () => {
    try {
      await refreshTemplates();
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Load templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddTemplate = () => {
    setIsNewTemplateFormOpen(true);
  };
  
  // Add handler functions for template form
  const onNewTemplateFormSubmit = async (templateData: any) => {
    console.log('Submitting template data:', templateData);
    try {
      // Add isTemplate flag to ensure it's saved as a template
      const templateWithFlags = {
        ...templateData,
        isTemplate: true
      };
      
      await addTemplate(templateWithFlags);
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

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        // Call the API to delete the template
        await deleteTemplate(id);
        // No need to update state here as it will be handled by the useTemplates hook
        fetchTemplates(); // Refresh the list after deletion
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      // Create a copy of the template with a new name
      const templateData = {
        ...template,
        name: `${template.name} (Copy)`,
        _id: undefined, // Remove the ID so a new one will be created
        id: undefined, // Remove the UI ID as well
        isTemplate: true
      };
      
      await addTemplate(templateData);
      fetchTemplates(); // Refresh the list after duplication
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
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
        <h1 className="text-2xl font-bold text-gray-800">Device Template Library</h1>
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
              <h2 className="text-xl font-semibold">Create New Device Template</h2>
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

export default TemplateManagement;

