import React, { useState } from 'react';

interface AddElementDialogProps {
  isOpen: boolean;
  onConfirm: (tagName: string, textContent: string) => void;
  onCancel: () => void;
}

const AddElementDialog: React.FC<AddElementDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const [tagName, setTagName] = useState('');
  const [textContent, setTextContent] = useState('');

  const handleConfirm = () => {
    if (tagName.trim()) {
      onConfirm(tagName.trim(), textContent.trim());
      setTagName('');
      setTextContent('');
    }
  };

  const handleCancel = () => {
    onCancel();
    setTagName('');
    setTextContent('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-4">Add New Element</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Element Tag Name
            </label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., UDS_Diag_Params"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Content (optional)
            </label>
            <input
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Element text content"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Element
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

export default AddElementDialog;
