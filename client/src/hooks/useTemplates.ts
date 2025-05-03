import { useState, useEffect, useCallback } from 'react';
import { 
  getTemplates, 
  getTemplateById,
  createTemplate, 
  updateTemplate, 
  deleteTemplate,
  getDeviceTypes,
  createDeviceType,
  Template,
  DeviceType
} from '../services/templates';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load device types
  const loadDeviceTypes = useCallback(async () => {
    try {
      const data = await getDeviceTypes();
      setDeviceTypes(data);
    } catch (err) {
      console.error('Failed to load device types:', err);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadTemplates();
    loadDeviceTypes();
  }, [loadTemplates, loadDeviceTypes]);

  // Add a template
  const addTemplate = useCallback(async (templateData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // If it's a new device type, handle that
      if (templateData.deviceType === 'new' && templateData.newDeviceType) {
        const newDeviceType = await createDeviceType({
          name: templateData.newDeviceType.name,
          description: templateData.newDeviceType.description,
          category: templateData.newDeviceType.category
        });
        
        // Update the template with the new device type
        templateData.deviceType = newDeviceType.name;
        
        // Update the device types list
        setDeviceTypes(prev => [...prev, newDeviceType]);
      }
      
      const newTemplate = await createTemplate(templateData);
      setTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (err) {
      setError(err as Error);
      console.error('Failed to add template:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a template by ID
  const getTemplate = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const template = await getTemplateById(id);
      return template;
    } catch (err) {
      setError(err as Error);
      console.error('Failed to get template:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a template
  const updateTemplateById = useCallback(async (id: string, templateData: any) => {
    try {
      setLoading(true);
      setError(null);
      const updatedTemplate = await updateTemplate(id, templateData);
      setTemplates(prev => prev.map(template => 
        template._id === id ? updatedTemplate : template
      ));
      return updatedTemplate;
    } catch (err) {
      setError(err as Error);
      console.error('Failed to update template:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a template
  const removeTemplate = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteTemplate(id);
      setTemplates(prev => prev.filter(template => template._id !== id));
    } catch (err) {
      setError(err as Error);
      console.error('Failed to delete template:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    templates,
    deviceTypes,
    loading,
    error,
    refreshTemplates: loadTemplates,
    refreshDeviceTypes: loadDeviceTypes,
    addTemplate,
    getTemplate,
    updateTemplate: updateTemplateById,
    deleteTemplate: removeTemplate
  };
};