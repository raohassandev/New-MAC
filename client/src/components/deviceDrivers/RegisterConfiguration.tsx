// client/src/components/templates/RegisterConfiguration.tsx
import React, { useState } from 'react';
import { Plus, Trash, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTemplateForm } from './TemplateFormContext';
import RegisterRangeEditor from './RegisterRangeEditor';
import { RegisterRange } from '../../types/form.types';

const TemplateRegisterConfiguration: React.FC = () => {
  const { state, actions } = useTemplateForm();
  const [expandedRangeIndex, setExpandedRangeIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleAddRange = () => {
    setIsAddingNew(true);
  };

  const handleEditRange = (index: number) => {
    setExpandedRangeIndex(index);
  };

  const handleDeleteRange = (index: number) => {
    actions.deleteRegisterRange(index);
  };

  const handleSaveRange = (range: RegisterRange) => {
    if (expandedRangeIndex !== null) {
      actions.updateRegisterRange(expandedRangeIndex, range);
      setExpandedRangeIndex(null);
    } else {
      actions.addRegisterRange(range);
      setIsAddingNew(false);
    }
  };

  const handleCancelEdit = () => {
    setExpandedRangeIndex(null);
    setIsAddingNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Template Register Ranges</h3>
        <Button onClick={handleAddRange} size="sm" icon={<Plus size={16} />} disabled={isAddingNew}>
          Add Register Range
        </Button>
      </div>

      {/* Add New Range Section - Expandable */}
      {isAddingNew && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-md mb-3 font-medium">Add New Template Register Range</h4>
          <RegisterRangeEditor onSave={handleSaveRange} onCancel={handleCancelEdit} />
        </div>
      )}

      {/* Existing Ranges List */}
      <div className="space-y-3">
        {state.registerRanges.length === 0 && !isAddingNew ? (
          <div className="rounded-md bg-gray-50 py-8 text-center">
            <p className="text-gray-500">No template register ranges defined yet.</p>
            <Button variant="outline" className="mt-2" size="sm" onClick={handleAddRange}>
              Add your first register range
            </Button>
          </div>
        ) : (
          state.registerRanges.map((range, index) => (
            <div key={index} className="overflow-hidden rounded-md border border-gray-200">
              <div
                className="flex cursor-pointer items-center justify-between bg-white p-4"
                onClick={() =>
                  expandedRangeIndex === index
                    ? setExpandedRangeIndex(null)
                    : setExpandedRangeIndex(index)
                }
              >
                <div>
                  <h4 className="font-medium text-gray-900">{range.rangeName}</h4>
                  <p className="text-sm text-gray-500">
                    Start: {range.startRegister}, Length: {range.length}, FC: {range.functionCode}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit size={16} />}
                    onClick={e => {
                      e.stopPropagation();
                      handleEditRange(index);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash size={16} />}
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteRange(index);
                    }}
                  >
                    Delete
                  </Button>
                  {expandedRangeIndex === index ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </div>

              {/* Expanded Edit Section */}
              {expandedRangeIndex === index && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <RegisterRangeEditor
                    initialData={range}
                    onSave={handleSaveRange}
                    onCancel={handleCancelEdit}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplateRegisterConfiguration;