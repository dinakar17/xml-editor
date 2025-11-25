import React from 'react';
import { FileText, X } from 'lucide-react';

interface XMLFile {
  id: string;
  name: string;
  data: any;
}

interface FilesSidebarProps {
  xmlFiles: XMLFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
}

const FilesSidebar: React.FC<FilesSidebarProps> = ({
  xmlFiles,
  activeFileId,
  onFileSelect,
  onFileRemove,
}) => {
  if (xmlFiles.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        XML Files ({xmlFiles.length})
      </h3>
      <div className="space-y-2">
        {xmlFiles.map((file) => (
          <div
            key={file.id}
            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
              file.id === activeFileId 
                ? 'bg-blue-100 border border-blue-300' 
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => onFileSelect(file.id)}
          >
            <span className="text-sm font-medium truncate flex-1" title={file.name}>
              {file.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Remove "${file.name}" from the list?`)) {
                  onFileRemove(file.id);
                }
              }}
              className="p-1 text-red-600 hover:bg-red-100 rounded ml-2"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilesSidebar;
