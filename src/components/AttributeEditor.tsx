import React from 'react';
import { Edit, Info, Plus, Trash2 } from 'lucide-react';

interface AttributeEditorProps {
  selectedAttribute: {
    elementPath: number[];
    attributeName: string;
    value: string;
  } | null;
  parameterDescriptions: any;
  onUpdateAttribute: (elementPath: number[], attributeName: string, newValue: string) => void;
  onClose: () => void;
  onValueChange: (newValue: string) => void;
}

const AttributeEditor: React.FC<AttributeEditorProps> = ({
  selectedAttribute,
  parameterDescriptions,
  onUpdateAttribute,
  onClose,
  onValueChange,
}) => {
  if (!selectedAttribute) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-600">
          Parameter Editor
        </h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Click attributes to edit values
          </p>
          <p className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Use + buttons to add elements/attributes
          </p>
          <p className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Use delete buttons to remove items
          </p>
          {Object.keys(parameterDescriptions).length > 0 && (
            <p className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Blue info icons show detailed descriptions
            </p>
          )}
        </div>
      </div>
    );
  }

  const { elementPath, attributeName, value } = selectedAttribute;
  const description = parameterDescriptions[attributeName];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Edit className="w-5 h-5 text-blue-600" />
        Edit Attribute
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attribute Name
          </label>
          <input
            type="text"
            value={attributeName}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>
        
        {description && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-semibold text-blue-800 mb-2">{description.title}</h4>
            <p className="text-sm text-blue-700 mb-2">{description.description}</p>
            {description.example && (
              <p className="text-xs text-blue-600">
                <strong>Example:</strong> {description.example}
              </p>
            )}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value
          </label>
          {description?.options ? (
            <select
              value={value}
              onChange={(e) => {
                const newValue = e.target.value;
                onUpdateAttribute(elementPath, attributeName, newValue);
                onValueChange(newValue);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {description.options.map((option: any) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const newValue = e.target.value;
                onUpdateAttribute(elementPath, attributeName, newValue);
                onValueChange(newValue);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter value..."
            />
          )}
        </div>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Done Editing
        </button>
      </div>
    </div>
  );
};

export default AttributeEditor;
