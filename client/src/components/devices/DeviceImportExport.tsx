import React, { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, List, FileText, X } from 'lucide-react';
import { toast } from 'react-toastify';

import { Device } from '../../types/device.types';

interface DeviceImportExportProps {
  devices: Device[];
  onImportDevices: (devices: Partial<Device>[]) => Promise<void>;
}

const DeviceImportExport: React.FC<DeviceImportExportProps> = ({ devices, onImportDevices }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedDevices, setParsedDevices] = useState<Partial<Device>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportFields, setExportFields] = useState<string[]>([
    'name',
    'ip',
    'port',
    'slaveId',
    'enabled',
    'make',
    'model',
    'tags',
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportErrors([]);
    setParsedDevices([]);

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'json') {
      setImportErrors(['Unsupported file format. Please use CSV or JSON files.']);
      return;
    }

    // Parse the file
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;

      try {
        if (extension === 'csv') {
          parseCsvFile(content);
        } else if (extension === 'json') {
          parseJsonFile(content);
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        setImportErrors(['Error parsing file. Please check the file format.']);
      }
    };

    reader.onerror = () => {
      setImportErrors(['Error reading file.']);
    };

    reader.readAsText(file);
  };

  // Parse CSV file
  const parseCsvFile = (content: string) => {
    const lines = content.split('\n');
    if (lines.length < 2) {
      setImportErrors(['CSV file must contain headers and at least one data row.']);
      return;
    }

    // Get headers
    const headers = lines[0].split(',').map(header => header.trim());
    const requiredFields = ['name'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));

    if (missingFields.length > 0) {
      setImportErrors([`CSV is missing required fields: ${missingFields.join(', ')}`]);
      return;
    }

    // Parse data rows
    const devices: Partial<Device>[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = line.split(',').map(value => value.trim());

      // Create device object
      const device: Partial<Device> = {};
      let hasError = false;

      headers.forEach((header, index) => {
        if (index >= values.length) {
          errors.push(`Line ${i + 1}: Missing value for field '${header}'`);
          hasError = true;
          return;
        }

        const value = values[index];

        switch (header) {
          case 'name':
            device.name = value;
            break;
          case 'ip':
            device.ip = value;
            break;
          case 'port':
            device.port = Number(value);
            break;
          case 'slaveId':
            device.slaveId = Number(value);
            break;
          case 'enabled':
            device.enabled = value.toLowerCase() === 'true';
            break;
          case 'make':
            device.make = value;
            break;
          case 'model':
            device.model = value;
            break;
          case 'tags':
            device.tags = value ? value.split(';').map(tag => tag.trim()) : [];
            break;
          // Add other fields as needed
        }
      });

      // Validate required fields
      if (!device.name) {
        errors.push(`Line ${i + 1}: Missing required field 'name'`);
        hasError = true;
      }

      if (!hasError) {
        devices.push(device);
      }
    }

    if (errors.length > 0) {
      setImportErrors(errors);
    }

    setParsedDevices(devices);
  };

  // Parse JSON file
  const parseJsonFile = (content: string) => {
    try {
      const jsonData = JSON.parse(content);

      if (!Array.isArray(jsonData)) {
        setImportErrors(['JSON file must contain an array of devices.']);
        return;
      }

      const devices: Partial<Device>[] = [];
      const errors: string[] = [];

      jsonData.forEach((item, index) => {
        if (!item.name) {
          errors.push(`Device at index ${index}: Missing required field 'name'`);
          return;
        }

        const device: Partial<Device> = {
          name: item.name,
          ip: item.ip,
          port: item.port ? Number(item.port) : undefined,
          slaveId: item.slaveId ? Number(item.slaveId) : undefined,
          enabled: item.enabled !== undefined ? Boolean(item.enabled) : undefined,
          make: item.make,
          model: item.model,
          tags: Array.isArray(item.tags) ? item.tags : [],
          // Add other fields as needed
        };

        devices.push(device);
      });

      if (errors.length > 0) {
        setImportErrors(errors);
      }

      setParsedDevices(devices);
    } catch (error) {
      setImportErrors(['Invalid JSON format. Please check the file.']);
    }
  };

  // Export devices to CSV
  const exportToCsv = () => {
    const headers = exportFields.join(',');
    const rows = devices.map(device => {
      const values = exportFields.map(field => {
        const value = device[field as keyof Device];

        if (field === 'tags' && Array.isArray(value)) {
          return `"${value.join(';')}"`;
        }

        if (value === undefined || value === null) {
          return '';
        }

        // Wrap strings with quotes if they contain commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }

        return value;
      });

      return values.join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    downloadFile(csvContent, 'devices_export.csv', 'text/csv');
  };

  // Export devices to JSON
  const exportToJson = () => {
    const exportedDevices = devices.map(device => {
      const exportedDevice: Record<string, any> = {};

      exportFields.forEach(field => {
        exportedDevice[field] = device[field as keyof Device];
      });

      return exportedDevice;
    });

    const jsonContent = JSON.stringify(exportedDevices, null, 2);
    downloadFile(jsonContent, 'devices_export.json', 'application/json');
  };

  // Handle download
  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle import
  const handleImport = async () => {
    if (parsedDevices.length === 0) {
      toast.error('No valid devices to import');
      return;
    }

    setImportLoading(true);
    try {
      await onImportDevices(parsedDevices);
      toast.success(`Successfully imported ${parsedDevices.length} devices`);
      setIsImportModalOpen(false);
      setImportFile(null);
      setParsedDevices([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing devices:', error);
      toast.error('Failed to import devices');
    } finally {
      setImportLoading(false);
    }
  };

  // Handle export
  const handleExport = () => {
    if (devices.length === 0) {
      toast.error('No devices to export');
      return;
    }

    if (exportFormat === 'csv') {
      exportToCsv();
    } else {
      exportToJson();
    }

    setIsExportModalOpen(false);
    toast.success(`Devices exported as ${exportFormat.toUpperCase()}`);
  };

  // Toggle export field selection
  const toggleExportField = (field: string) => {
    setExportFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  return (
    <div>
      {/* Import/Export Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          <Upload size={16} className="mr-2" />
          Import Devices
        </button>
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          disabled={devices.length === 0}
        >
          <Download size={16} className="mr-2" />
          Export Devices
        </button>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Import Devices</h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <p className="mb-2 text-gray-600">
                  Upload a CSV or JSON file with device data. The file must include at least the
                  'name' field.
                </p>
                <label className="mb-1 block text-sm font-medium text-gray-700">Select File</label>
                <input
                  type="file"
                  accept=".csv,.json"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {importFile && (
                <div className="mb-4 rounded-md bg-blue-50 p-3">
                  <p className="font-medium">
                    File: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="mb-4 rounded-md border-l-4 border-red-500 bg-red-50 p-3">
                  <div className="flex items-start">
                    <AlertCircle size={20} className="mr-2 mt-0.5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-800">
                        {importErrors.length} error
                        {importErrors.length > 1 ? 's' : ''} found:
                      </p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-red-700">
                        {importErrors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importErrors.length > 5 && (
                          <li>...and {importErrors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {parsedDevices.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">
                    Preview ({parsedDevices.length} devices)
                  </h3>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            IP Address
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Make/Model
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {parsedDevices.slice(0, 10).map((device, index) => (
                          <tr key={index}>
                            <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
                              {device.name}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                              {device.ip}
                              {device.port && `:${device.port}`}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                              {device.make || '-'} {device.model || ''}
                            </td>
                          </tr>
                        ))}
                        {parsedDevices.length > 10 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-center text-sm text-gray-500">
                              ...and {parsedDevices.length - 10} more devices
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importLoading || parsedDevices.length === 0 || importErrors.length > 0}
                  className="rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importLoading ? 'Importing...' : `Import ${parsedDevices.length} Devices`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Export Devices</h2>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Export Format
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                    />
                    <span className="ml-2 text-gray-700">CSV</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                    />
                    <span className="ml-2 text-gray-700">JSON</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fields to Export
                </label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={exportFields.includes('name')}
                        onChange={() => toggleExportField('name')}
                        disabled={true} // 'name' is required
                      />
                      <span className="ml-2 text-gray-700">Name</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={exportFields.includes('ip')}
                        onChange={() => toggleExportField('ip')}
                      />
                      <span className="ml-2 text-gray-700">IP Address</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={exportFields.includes('port')}
                        onChange={() => toggleExportField('port')}
                      />
                      <span className="ml-2 text-gray-700">Port</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={exportFields.includes('slaveId')}
                        onChange={() => toggleExportField('slaveId')}
                      />
                      <span className="ml-2 text-gray-700">Slave ID</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={exportFields.includes('enabled')}
                        onChange={() => toggleExportField('enabled')}
                      />
                      <span className="ml-2 text-gray-700">Status</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={exportFields.includes('make')}
                        onChange={() => toggleExportField('make')}
                      />
                      <span className="ml-2 text-gray-700">Make</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={exportFields.includes('model')}
                        onChange={() => toggleExportField('model')}
                      />
                      <span className="ml-2 text-gray-700">Model</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={exportFields.includes('tags')}
                        onChange={() => toggleExportField('tags')}
                      />
                      <span className="ml-2 text-gray-700">Tags</span>
                    </label>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {exportFields.length} fields selected for export
                </p>
              </div>

              <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  Export {devices.length} Devices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceImportExport;
