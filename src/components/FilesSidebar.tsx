import React, { useState } from 'react';
import { FileText, X, Search, Plus, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

interface XMLFile {
  id: string;
  name: string;
  data: any;
  partNumber?: string;
}

interface FilesSidebarProps {
  xmlFiles: XMLFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onLoadPartNumber: (partNo: string) => Promise<boolean>;
  isLoadingPartNumber: boolean;
}

const FilesSidebar: React.FC<FilesSidebarProps> = ({
  xmlFiles,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onLoadPartNumber,
  isLoadingPartNumber,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [loadedPartNumbers, setLoadedPartNumbers] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({
    'DID List': true,
    'Fault List': true,
    'PID List': true,
  });

  const handleLoadPartNumber = async () => {
    if (!partNumber.trim()) return;
    const trimmedPart = partNumber.trim();
    
    // Check if already loaded
    if (loadedPartNumbers.includes(trimmedPart)) {
      alert(`Part number ${trimmedPart} is already loaded`);
      return;
    }
    
    const success = await onLoadPartNumber(trimmedPart);
    
    // Only add to badges if loading was successful
    if (success) {
      setLoadedPartNumbers(prev => [...prev, trimmedPart]);
      setPartNumber(''); // Clear input after successful loading
    }
  };

  const handleRemovePartNumber = (partNo: string) => {
    // Remove all files associated with this part number
    const filesToRemove = xmlFiles.filter(f => f.partNumber === partNo);
    filesToRemove.forEach(file => onFileRemove(file.id));
    
    // Remove from loaded part numbers
    setLoadedPartNumbers(prev => prev.filter(p => p !== partNo));
  };

  // Filter files based on search query
  const filteredFiles = xmlFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group files by type
  const didListFiles = filteredFiles.filter(file => 
    file.name.toLowerCase().includes('did_list') || file.name.toLowerCase().includes('uds_did')
  );
  const faultListFiles = filteredFiles.filter(file => 
    file.name.toLowerCase().includes('fault_list') || file.name.toLowerCase().includes('uds_fault')
  );
  const pidListFiles = filteredFiles.filter(file => 
    file.name.toLowerCase().includes('pid_list') || file.name.toLowerCase().includes('uds_pid')
  );

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const renderFileGroup = (title: string, files: XMLFile[], color: string) => {
    if (files.length === 0) return null;

    const isExpanded = expandedGroups[title];

    return (
      <div className="mb-3">
        <button
          onClick={() => toggleGroup(title)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span className={`text-sm font-semibold ${color}`}>
              {title} ({files.length})
            </span>
          </div>
        </button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2 pl-2">
            {files.map((file) => (
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
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        XML Files ({filteredFiles.length}/{xmlFiles.length})
      </h3>
      
      {/* Part Number Input */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Load by Part Number
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Enter part number to search..."
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLoadPartNumber();
            }}
            disabled={isLoadingPartNumber}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            onClick={handleLoadPartNumber}
            disabled={isLoadingPartNumber || !partNumber.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
            title="Load XML files for this part number"
          >
            {isLoadingPartNumber ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Part Number Badges */}
        {loadedPartNumbers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {loadedPartNumbers.map((part) => (
              <div
                key={part}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200"
              >
                <span>{part}</span>
                <button
                  onClick={() => {
                    if (window.confirm(`Remove all files for part number "${part}"?`)) {
                      handleRemovePartNumber(part);
                    }
                  }}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  title={`Remove part ${part}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
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
        {xmlFiles.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            <p>No XML files loaded.</p>
            <p className="mt-2">Enter a part number above to load files.</p>
          </div>
        ) : filteredFiles.length > 0 ? (
          <>
            {renderFileGroup('DID List', didListFiles, 'text-blue-700')}
            {renderFileGroup('Fault List', faultListFiles, 'text-red-700')}
            {renderFileGroup('PID List', pidListFiles, 'text-green-700')}
          </>
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
