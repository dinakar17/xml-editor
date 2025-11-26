import React, { useState, useEffect } from 'react';
import { Edit, Info, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { validateAttributeValue, getValidationInfo } from '@/utils/validationUtils';

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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState('');

  useEffect(() => {
    if (selectedAttribute) {
      setLocalValue(selectedAttribute.value);
      // Validate initial value
      const validation = validateAttributeValue(
        selectedAttribute.attributeName,
        selectedAttribute.value,
        parameterDescriptions
      );
      setValidationError(validation.isValid ? null : validation.error || null);
    }
  }, [selectedAttribute, parameterDescriptions]);

  const handleValueChange = (newValue: string) => {
    setLocalValue(newValue);
    
    // Validate the new value
    const validation = validateAttributeValue(
      selectedAttribute!.attributeName,
      newValue,
      parameterDescriptions
    );
    
    setValidationError(validation.isValid ? null : validation.error || null);
    
    // Only update if valid
    if (validation.isValid) {
      onUpdateAttribute(selectedAttribute!.elementPath, selectedAttribute!.attributeName, newValue);
      onValueChange(newValue);
    }
  };

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
  const validationInfo = getValidationInfo(attributeName, parameterDescriptions);

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
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 transition-colors ${
                validationError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              {description.options.map((option: any) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <>
              <input
                type="text"
                value={localValue}
                onChange={(e) => handleValueChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 transition-colors ${
                  validationError 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-green-500 focus:ring-green-500'
                }`}
                placeholder={validationInfo.placeholder || 'Enter value...'}
              />
              {validationInfo.hint && !validationError && (
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {validationInfo.hint}
                </p>
              )}
            </>
          )}
          
          {/* Validation feedback */}
          {validationError && (
            <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
          
          {!validationError && localValue && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Valid value</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          disabled={!!validationError}
          className={`w-full px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
            validationError
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          title={validationError ? 'Fix validation errors before closing' : 'Done editing'}
        >
          <Edit className="w-4 h-4" />
          {validationError ? 'Fix Errors to Continue' : 'Done Editing'}
        </button>
      </div>
    </div>
  );
};

export default AttributeEditor;
