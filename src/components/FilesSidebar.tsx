import React, { useState } from 'react';
import { FileText, X, Search } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');

  if (xmlFiles.length === 0) return null;

  // Filter files based on search query
  const filteredFiles = xmlFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        XML Files ({filteredFiles.length}/{xmlFiles.length})
      </h3>
      
      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {filteredFiles.length > 0 ? (
          filteredFiles.map((file) => (
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
          ))
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">
            No files match "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};

export default FilesSidebar;
