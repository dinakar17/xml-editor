'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Download, Plus, FileText, Eye, LogOut, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigationGuard } from 'next-navigation-guard';
import FilesSidebar from '@/components/FilesSidebar';
import DescriptionsStatus from '@/components/DescriptionsStatus';
import AddElementDialog from '@/components/AddElementDialog';
import AddAttributeDialog from '@/components/AddAttributeDialog';
import AttributeEditor from '@/components/AttributeEditor';
import XMLElement from '@/components/XMLElement';
import XMLViewerModal from '@/components/XMLViewerModal';
import { parseXML, xmlDocumentToObject, objectToXML, getElementByPath } from '@/utils/xmlUtils';
import { useAPILoader } from '@/hooks/useAPILoader';

interface XMLFile {
  id: string;
  name: string;
  data: any;
  originalData?: any;
  changes: string[];
  partNumber?: string;
}

const XMLEditor = () => {
  const router = useRouter();
  
  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Use custom hook for API data loading
  const {
    parameterDescriptions,
    isLoadingDescriptions,
    descriptionsError,
    xmlFiles,
    isLoadingPartNumber,
    loadPartNumberError,
    setXmlFiles,
    loadXMLsByPartNumber,
  } = useAPILoader();

  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<any>(null);
  const [showAddElement, setShowAddElement] = useState<any>(false);
  const [showAddAttribute, setShowAddAttribute] = useState<any>(false);
  const [editingFileName, setEditingFileName] = useState<boolean>(false);
  const [showXMLViewer, setShowXMLViewer] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{path: number[], type: 'element' | 'attribute', name: string, value?: string}[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const activeFile = xmlFiles.find(f => f.id === activeFileId);
  const xmlData = activeFile?.data || null;
  const fileName = activeFile?.name || '';
  const fileChanges = activeFile?.changes || [];
  const hasChanges = xmlFiles.some(f => f.changes.length > 0);

  // Use next-navigation-guard to prevent navigation when there are unsaved changes
  useNavigationGuard({
    enabled: hasChanges,
    confirm: () => window.confirm('You have unsaved changes that will be lost. Are you sure you want to leave?')
  });

  // Set active file when xmlFiles are loaded
  useEffect(() => {
    if (xmlFiles.length > 0 && !activeFileId) {
      setActiveFileId(xmlFiles[0].id);
    }
  }, [xmlFiles, activeFileId]);


  const handleXmlUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const xmlDoc = parseXML(e.target.result);
          const xmlObject = xmlDocumentToObject(xmlDoc);
          const fileId = Date.now().toString() + Math.random().toString(36);
          // Strip appended timestamp patterns like _YYYYMMDD_HHMMSS or _DDMMYYYY_HHMMSS before storing
          const stripTimestampFromName = (name: string) => {
            // split extension
            const parts = name.split('.');
            const ext = parts.length > 1 ? `.${parts.pop()}` : '';
            const base = parts.join('.');
            // regex for _YYYYMMDD_HHMMSS or _DDMMYYYY_HHMMSS (both with underscore separator)
            const cleanedBase = base.replace(/_(?:20\d{2}\d{2}\d{2}|\d{2}\d{2}20\d{2})_\d{6}$/, '');
            return cleanedBase + ext;
          };

          const cleanedName = stripTimestampFromName(file.name);

          const newFile: XMLFile = { 
            id: fileId, 
            name: cleanedName, 
            data: xmlObject,
            originalData: JSON.parse(JSON.stringify(xmlObject)),
            changes: []
          };
          setXmlFiles(prev => {
            const updated = [...prev, newFile];
            if (!activeFileId) { setActiveFileId(fileId); }
            return updated;
          });
          setSelectedElement(null);
          setSelectedAttribute(null);
        } catch (error: any) {
          alert(`Error parsing ${file.name}: ${error.message}`);
        }
      };
      reader.readAsText(file);
    });
    event.target.value = '';
  };

  const downloadXML = async () => {
    if (!xmlData || !activeFileId) return;

    // Create timestamp in format: DDMMYYYY_HHMMSS
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    // Insert timestamp before file extension
    const nameParts = fileName.split('.');
    const extension = nameParts.pop();
    const baseName = nameParts.join('.');
    const downloadName = `${baseName}_${timestamp}.${extension}`;
    
    const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + objectToXML(xmlData);
    
    // Check if running in Tauri
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        
        // Open save dialog
        const filePath = await save({
          defaultPath: downloadName,
          filters: [{
            name: 'XML',
            extensions: ['xml']
          }]
        });
        
        if (filePath) {
          await writeTextFile(filePath, xmlString);
          alert(`File saved successfully to ${filePath}`);
        }
      } catch (error: any) {
        console.error('Error saving file:', error);
        alert(`Error saving file: ${error.message}`);
      }
    } else {
      // Fallback for browser (development mode)
      const blob = new Blob([xmlString], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const updateActiveFileData = (newData: any) => {
    if (!activeFileId) return;
    setXmlFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, data: newData } : f));
  };

  const addChangeLog = (changeDescription: string) => {
    if (!activeFileId) return;
    setXmlFiles(prev => prev.map(f => 
      f.id === activeFileId 
        ? { ...f, changes: [...f.changes, changeDescription] }
        : f
    ));
  };

  const updateFileName = (newName: string) => {
    if (!activeFileId) return;
    setXmlFiles(prev => prev.map(f => 
      f.id === activeFileId ? { ...f, name: newName } : f
    ));
  };

  const updateElement = (elementPath: number[], updates: Partial<Element>) => {
    const updateNestedObject = (obj: any, path: number[], newData: Partial<Element>) => {
      if (path.length === 0) return { ...obj, ...newData };
      const [currentIndex, ...remainingPath] = path;
      return {
        ...obj,
        children: obj.children.map((child: any, index: number) => 
          index === currentIndex ? updateNestedObject(child, remainingPath, newData) : child
        )
      };
    };
    updateActiveFileData(updateNestedObject(xmlData, elementPath, updates));
  };

  const addElement = (parentPath: number[], newElement: any) => {
    const addToNestedObject = (obj: any, path: number[], element: any) => {
      if (path.length === 0) return { ...obj, children: [...obj.children, element] };
      const [currentIndex, ...remainingPath] = path;
      return {
        ...obj,
        children: obj.children.map((child: any, index: number) => 
          index === currentIndex ? addToNestedObject(child, remainingPath, element) : child
        )
      };
    };
    updateActiveFileData(addToNestedObject(xmlData, parentPath, newElement));
  };

  const deleteElement = (elementPath: number[]) => {
    const element = getElementByPath(xmlData, elementPath);
    const deleteFromNestedObject = (obj: any, path: number[]) => {
      if (path.length === 1) {
        return { ...obj, children: obj.children.filter((_: any, index: number) => index !== path[0]) };
      }
      const [currentIndex, ...remainingPath] = path;
      return {
        ...obj,
        children: obj.children.map((child: any, index: number) => 
          index === currentIndex ? deleteFromNestedObject(child, remainingPath) : child
        )
      };
    };
    updateActiveFileData(deleteFromNestedObject(xmlData, elementPath));
    addChangeLog(`Deleted element <${element.tagName}>`);
  };

  const updateAttribute = (elementPath: number[], attributeName: string, newValue: string) => {
    const element = getElementByPath(xmlData, elementPath);
    const currentValue = element.attributes[attributeName];
    
    updateElement(elementPath, {
      attributes: { ...element.attributes, [attributeName]: newValue }
    });
    
    // Track change with original value from the XML
    if (!activeFileId) return;
    setXmlFiles(prev => prev.map(f => {
      if (f.id !== activeFileId) return f;
      
      // Get the original value from the original data
      const originalElement = getElementByPath(f.originalData, elementPath);
      const originalValue = originalElement.attributes[attributeName];
      
      // Remove any previous change for this same attribute
      const filteredChanges = f.changes.filter(change => 
        !change.includes(`"${attributeName}" in <${element.tagName}>`)
      );
      
      // If value is reverted to original, don't add it to changes
      if (newValue === originalValue) {
        return { ...f, changes: filteredChanges };
      }
      
      // Otherwise, add the change
      const newChange = `Updated "${attributeName}" in <${element.tagName}> from "${originalValue}" to "${newValue}"`;
      return { ...f, changes: [...filteredChanges, newChange] };
    }));
  };

  const addAttribute = (elementPath: number[], attributeName: string, attributeValue: string) => {
    const element = getElementByPath(xmlData, elementPath);
    updateElement(elementPath, { attributes: { ...element.attributes, [attributeName]: attributeValue } });
    addChangeLog(`Added attribute "${attributeName}=${attributeValue}" to <${element.tagName}>`);
  };

  const deleteAttribute = (elementPath: number[], attributeName: string) => {
    const element = getElementByPath(xmlData, elementPath);
    const newAttributes = { ...element.attributes };
    const deletedValue = newAttributes[attributeName];
    delete newAttributes[attributeName];
    updateElement(elementPath, { attributes: newAttributes });
    addChangeLog(`Deleted attribute "${attributeName}=${deletedValue}" from <${element.tagName}>`);
  };

  // Helper function to find the first occurrence of an attribute by name in XML tree
  const findAttributeInXML = (element: any, attributeName: string, path: number[] = []): { elementPath: number[], value: string } | null => {
    // Check if current element has the attribute
    if (element.attributes && attributeName in element.attributes) {
      return {
        elementPath: path,
        value: element.attributes[attributeName]
      };
    }

    // Recursively search in children
    if (element.children) {
      for (let i = 0; i < element.children.length; i++) {
        const result = findAttributeInXML(element.children[i], attributeName, [...path, i]);
        if (result) return result;
      }
    }

    return null;
  };

  const handleFileSelect = (fileId: string) => {
    setActiveFileId(fileId);
    setSelectedElement(null);
    
    // Clear search when switching files
    clearSearch();
    
    // Keep selectedAttribute open if the same attribute exists anywhere in the new file
    if (selectedAttribute) {
      const newFile = xmlFiles.find(f => f.id === fileId);
      if (newFile) {
        // First, try to find the attribute at the same element path
        try {
          const element = getElementByPath(newFile.data, selectedAttribute.elementPath);
          if (element && element.attributes && selectedAttribute.attributeName in element.attributes) {
            // Update the value to reflect the new file's value
            setSelectedAttribute({
              ...selectedAttribute,
              value: element.attributes[selectedAttribute.attributeName]
            });
            return;
          }
        } catch (error) {
          // Element path doesn't exist, continue to search elsewhere
        }

        // If not found at same path, search for the attribute anywhere in the XML
        const foundAttribute = findAttributeInXML(newFile.data, selectedAttribute.attributeName);
        if (foundAttribute) {
          setSelectedAttribute({
            elementPath: foundAttribute.elementPath,
            attributeName: selectedAttribute.attributeName,
            value: foundAttribute.value
          });
        } else {
          // Attribute doesn't exist anywhere in new file, close editor
          setSelectedAttribute(null);
        }
      }
    }
  };

  const handleFileRemove = (fileId: string) => {
    setXmlFiles(prev => prev.filter(f => f.id !== fileId));
    if (fileId === activeFileId) {
      const remaining = xmlFiles.filter(f => f.id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleAddElementConfirm = (tagName: string, textContent: string) => {
    if (showAddElement) {
      addElement(showAddElement.parentPath, { tagName, attributes: {}, children: [], textContent });
      const parentElement = showAddElement.parentPath.length === 0 
        ? 'root' 
        : getElementByPath(xmlData, showAddElement.parentPath).tagName;
      addChangeLog(`Added element <${tagName}> to <${parentElement}>`);
      setShowAddElement(false);
    }
  };

  const handleAddAttributeConfirm = (attributeName: string, attributeValue: string) => {
    if (showAddAttribute) {
      addAttribute(showAddAttribute.elementPath, attributeName, attributeValue);
      setShowAddAttribute(false);
    }
  };

  const handleLogout = () => {
    if (hasChanges) {
      const confirm = window.confirm('You have unsaved changes that will be lost. Are you sure you want to logout?');
      if (!confirm) return;
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenExpiry');
    localStorage.removeItem('dealerCode');
    localStorage.removeItem('environment');
    router.push('/login');
  };

  const handleLoadPartNumber = async (partNo: string) => {
    try {
      await loadXMLsByPartNumber(partNo);
      return true; // Success
    } catch (error: any) {
      alert(`Error loading part ${partNo}: ${error.message}`);
      return false; // Failure
    }
  };

  // Search functionality - memoize to prevent recreation on every render
  const searchInXML = useCallback((element: any, path: number[] = [], results: any[] = [], searchQuery: string) => {
    if (!searchQuery.trim()) return results;

    const search = searchQuery.toLowerCase();

    // Search in element tag name
    if (element.tagName && element.tagName.toLowerCase().includes(search)) {
      results.push({ path: [...path], type: 'element', name: element.tagName });
    }

    // Search in attributes
    if (element.attributes) {
      Object.entries(element.attributes).forEach(([key, value]) => {
        if (key.toLowerCase().includes(search) || String(value).toLowerCase().includes(search)) {
          results.push({ path: [...path], type: 'attribute', name: key, value: String(value) });
        }
      });
    }

    // Search in text content
    if (element.textContent && element.textContent.toLowerCase().includes(search)) {
      results.push({ path: [...path], type: 'element', name: element.tagName });
    }

    // Recursively search children
    if (element.children) {
      element.children.forEach((child: any, index: number) => {
        searchInXML(child, [...path, index], results, searchQuery);
      });
    }

    return results;
  }, []);

  const handleSearch = useCallback(() => {
    if (!xmlData || !searchTerm.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results = searchInXML(xmlData, [], [], searchTerm);
    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [xmlData, searchTerm, searchInXML]);

  const navigateSearch = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    if (direction === 'next') {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else {
      setCurrentSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    }
  }, [searchResults.length]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800">XML Parameter Editor</h1>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />Upload XML Files
              </button>
              {xmlData && (
                <>
                  <button onClick={downloadXML} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />Download Modified XML
                  </button>
                  <button onClick={() => setShowXMLViewer(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <Eye className="w-4 h-4" />View XML
                  </button>
                  <button onClick={() => setShowAddElement({ parentPath: [], parentElement: xmlData })} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" />Add Root Element
                  </button>
                </>
              )}
              {fileName && <span className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">Current: {fileName}</span>}
            </div>
            <input ref={fileInputRef} type="file" accept=".xml" multiple onChange={handleXmlUpload} className="hidden" />
          </div>
        </div>
        <DescriptionsStatus isLoading={isLoadingDescriptions} error={descriptionsError} descriptionsCount={Object.keys(parameterDescriptions).length} />
        
        {/* Part Number Loading Error */}
        {loadPartNumberError && (
          <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-red-800">❌ {loadPartNumberError}</span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <FilesSidebar 
              xmlFiles={xmlFiles} 
              activeFileId={activeFileId} 
              onFileSelect={handleFileSelect} 
              onFileRemove={handleFileRemove}
              onLoadPartNumber={handleLoadPartNumber}
              isLoadingPartNumber={isLoadingPartNumber}
            />
          </div>
          
          {xmlData ? (
            <>
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {/* Inline File Name Editor */}
                <div className="mb-3 flex items-center gap-2">
                  {editingFileName ? (
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => updateFileName(e.target.value)}
                      onBlur={() => setEditingFileName(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingFileName(false);
                        if (e.key === 'Escape') setEditingFileName(false);
                      }}
                      className="flex-1 px-3 py-1 text-base font-semibold border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <h2 
                        className="text-lg font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => setEditingFileName(true)}
                        title="Click to edit filename"
                      >
                        {fileName}
                      </h2>
                      {fileChanges.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Modified
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <h3 className="text-base font-medium mb-2 text-gray-700">XML Structure</h3>
                
                {/* Search Bar */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search elements, attributes, values..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                        if (e.key === 'Escape') clearSearch();
                      }}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Search
                  </button>
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600">
                        {currentSearchIndex + 1}/{searchResults.length}
                      </span>
                      <button
                        onClick={() => navigateSearch('prev')}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Previous result"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigateSearch('next')}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Next result"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={clearSearch}
                        className="px-2 py-1 text-sm text-red-600 hover:bg-red-100 rounded"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                  <XMLElement 
                    element={xmlData} 
                    path={[]} 
                    parameterDescriptions={parameterDescriptions} 
                    onAttributeClick={(elementPath, attributeName, value) => setSelectedAttribute({ elementPath, attributeName, value })} 
                    onDeleteAttribute={deleteAttribute} 
                    onDeleteElement={deleteElement} 
                    onShowAddAttribute={(elementPath, element) => setShowAddAttribute({ elementPath, element })} 
                    onShowAddElement={(parentPath, parentElement) => setShowAddElement({ parentPath, parentElement })}
                    searchResults={searchResults}
                    currentSearchIndex={currentSearchIndex}
                  />
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1 space-y-4">
              <AttributeEditor selectedAttribute={selectedAttribute} parameterDescriptions={parameterDescriptions} onUpdateAttribute={updateAttribute} onClose={() => setSelectedAttribute(null)} onValueChange={(newValue) => setSelectedAttribute({ ...selectedAttribute, value: newValue })} />
              
              {/* Changes Log */}
              {fileChanges.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                  <h3 className="text-base font-semibold mb-2 text-gray-800">Changes Made</h3>
                  <div className="max-h-80 overflow-y-auto space-y-1.5">
                    {fileChanges.map((change, index) => (
                      <div key={index} className="text-xs text-gray-600 p-1.5 bg-gray-50 rounded border-l-2 border-blue-500">
                        {change}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </>
          ) : (
            <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No XML File Loaded</h2>
              <p className="text-gray-500 mb-6">
                Enter a part number in the sidebar to load XML files, or upload XML files manually to start editing parameters.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <Upload className="w-5 h-5" />Upload XML Files
                </button>
              </div>
            </div>
          )}
        </div>
        <AddElementDialog isOpen={!!showAddElement} onConfirm={handleAddElementConfirm} onCancel={() => setShowAddElement(false)} />
        <AddAttributeDialog isOpen={!!showAddAttribute} onConfirm={handleAddAttributeConfirm} onCancel={() => setShowAddAttribute(false)} />
        <XMLViewerModal 
          isOpen={showXMLViewer} 
          xmlString={xmlData ? '<?xml version="1.0" encoding="UTF-8"?>\n' + objectToXML(xmlData) : ''} 
          fileName={fileName}
          onClose={() => setShowXMLViewer(false)} 
        />
      </div>
    </div>
  );
};

export default XMLEditor;