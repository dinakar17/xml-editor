import React, { useState } from 'react';

interface AddAttributeDialogProps {
  isOpen: boolean;
  onConfirm: (attributeName: string, attributeValue: string) => void;
  onCancel: () => void;
}

const AddAttributeDialog: React.FC<AddAttributeDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const [attrName, setAttrName] = useState('');
  const [attrValue, setAttrValue] = useState('');

  const handleConfirm = () => {
    if (attrName.trim()) {
      onConfirm(attrName.trim(), attrValue.trim());
      setAttrName('');
      setAttrValue('');
    }
  };

  const handleCancel = () => {
    onCancel();
    setAttrName('');
    setAttrValue('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-4">Add New Attribute</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attribute Name
            </label>
            <input
              type="text"
              value={attrName}
              onChange={(e) => setAttrName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., MemAddrBytes"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attribute Value
            </label>
            <input
              type="text"
              value={attrValue}
              onChange={(e) => setAttrValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Attribute value"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Add Attribute
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAttributeDialog;
