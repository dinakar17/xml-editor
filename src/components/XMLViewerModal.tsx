import React from 'react';
import { X } from 'lucide-react';
import XMLViewer from 'react-xml-viewer';

interface XMLViewerModalProps {
  isOpen: boolean;
  xmlString: string;
  fileName: string;
  onClose: () => void;
}

const XMLViewerModal: React.FC<XMLViewerModalProps> = ({
  isOpen,
  xmlString,
  fileName,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">XML Viewer</h2>
            <p className="text-sm text-gray-500 mt-1">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* XML Content */}
        <div className="flex-1 overflow-auto p-4">
          <XMLViewer
            xml={xmlString}
            collapsible={true}
            theme={{
              attributeKeyColor: '#0066cc',
              attributeValueColor: '#008800',
              tagColor: '#cc0000',
              textColor: '#333333',
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default XMLViewerModal;
