'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Plus, FileText } from 'lucide-react';
import FilesSidebar from '@/components/FilesSidebar';
import DescriptionsStatus from '@/components/DescriptionsStatus';
import AddElementDialog from '@/components/AddElementDialog';
import AddAttributeDialog from '@/components/AddAttributeDialog';
import AttributeEditor from '@/components/AttributeEditor';
import XMLElement from '@/components/XMLElement';
import { parseXML, xmlDocumentToObject, objectToXML, getElementByPath } from '@/utils/xmlUtils';

interface XMLFile {
  id: string;
  name: string;
  data: any;
  originalData?: any;
  changes: string[];
}

const XMLEditor = () => {
  const [xmlFiles, setXmlFiles] = useState<XMLFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<any>(null);
  const [parameterDescriptions, setParameterDescriptions] = useState<any>({});
  const [isLoadingDescriptions, setIsLoadingDescriptions] = useState(true);
  const [descriptionsError, setDescriptionsError] = useState<string | null>(null);
  const [showAddElement, setShowAddElement] = useState<any>(false);
  const [showAddAttribute, setShowAddAttribute] = useState<any>(false);
  const [editingFileName, setEditingFileName] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const activeFile = xmlFiles.find(f => f.id === activeFileId);
  const xmlData = activeFile?.data || null;
  const fileName = activeFile?.name || '';
  const fileChanges = activeFile?.changes || [];

  useEffect(() => {
    const loadParameterDescriptions = async () => {
      try {
        // First, get the file link from the API
        const folderPath = encodeURIComponent('/BALNOSTICS/XMLEditor');
        const folderResponse = await fetch(`https://abdrive.bajajauto.com/secure/user/file/download?folder_path=${folderPath}`, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer $2y$10$cHek8vAlpqqGKgZi1dA7/OEwq1gM9JPVV9QWg3h7TfEoNXct6XS8S'
          }
        });

        if (!folderResponse.ok) {
          throw new Error(`Failed to fetch folder contents: ${folderResponse.status} ${folderResponse.statusText}`);
        }

        const folderData = await folderResponse.json();
        
        if (!folderData.status || !folderData.response?.file_links || folderData.response.file_links.length === 0) {
          throw new Error('No files found in the folder');
        }

        // Get the first JSON file (or the specific did_xml_params.json)
        const jsonFile = folderData.response.file_links.find((file: any) => 
          file.file_name.endsWith('.json')
        ) || folderData.response.file_links[0];

        if (!jsonFile) {
          throw new Error('No JSON file found in the response');
        }

        // Now fetch the actual JSON content from the link
        const descriptionsResponse = await fetch(jsonFile.link);
        
        if (!descriptionsResponse.ok) {
          throw new Error(`Failed to fetch descriptions: ${descriptionsResponse.status} ${descriptionsResponse.statusText}`);
        }

        const descriptions = await descriptionsResponse.json();
        setParameterDescriptions(descriptions);
        setDescriptionsError(null);
        console.log('✓ Parameter descriptions loaded from API');
      } catch (error) {
        console.error('Error loading parameter descriptions:', error);
        // Silently fallback to local file if API fails
        try {
          const localResponse = await fetch('/config/did_xml_params.json');
          if (localResponse.ok) {
            const descriptions = await localResponse.json();
            setParameterDescriptions(descriptions);
            setDescriptionsError(null);
            console.log('✓ Parameter descriptions loaded from local file (API fallback)');
          } else {
            setDescriptionsError('Failed to load parameter descriptions from both API and local file');
          }
        } catch (localError) {
          setDescriptionsError('Failed to load parameter descriptions');
        }
      } finally {
        setIsLoadingDescriptions(false);
      }
    };
    loadParameterDescriptions();
  }, []);

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
          const newFile: XMLFile = { 
            id: fileId, 
            name: file.name, 
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

  const downloadXML = () => {
    if (!xmlData || !activeFileId) return;

    // Create timestamp in format: DDMMYYYY_HHMMSS
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    // Insert timestamp before file extension
    const nameParts = fileName.split('.');
    const extension = nameParts.pop();
    const baseName = nameParts.join('.');
    const downloadName = `${baseName}_${timestamp}.${extension}`;
    
    // Direct download without popup
    const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + objectToXML(xmlData);
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const handleFileSelect = (fileId: string) => {
    setActiveFileId(fileId);
    setSelectedElement(null);
    setSelectedAttribute(null);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">XML Parameter Editor</h1>
            <div className="flex flex-wrap gap-4 items-center">
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />Upload XML Files
              </button>
              {xmlData && (
                <>
                  <button onClick={downloadXML} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />Download Modified XML
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
        {xmlData ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <FilesSidebar xmlFiles={xmlFiles} activeFileId={activeFileId} onFileSelect={handleFileSelect} onFileRemove={handleFileRemove} />
              
              {/* Changes Log */}
              {fileChanges.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Changes Made</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {fileChanges.map((change, index) => (
                      <div key={index} className="text-xs text-gray-600 p-2 bg-gray-50 rounded border-l-2 border-blue-500">
                        {change}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Inline File Name Editor */}
                <div className="mb-4 flex items-center gap-2">
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
                      className="flex-1 px-3 py-1 text-lg font-semibold border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <h2 
                      className="flex-1 text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => setEditingFileName(true)}
                      title="Click to edit filename"
                    >
                      {fileName}
                    </h2>
                  )}
                </div>
                
                <h3 className="text-lg font-medium mb-3 text-gray-700">XML Structure</h3>
                <div className="max-h-96 overflow-y-auto">
                  <XMLElement element={xmlData} path={[]} parameterDescriptions={parameterDescriptions} onAttributeClick={(elementPath, attributeName, value) => setSelectedAttribute({ elementPath, attributeName, value })} onDeleteAttribute={deleteAttribute} onDeleteElement={deleteElement} onShowAddAttribute={(elementPath, element) => setShowAddAttribute({ elementPath, element })} onShowAddElement={(parentPath, parentElement) => setShowAddElement({ parentPath, parentElement })} />
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <AttributeEditor selectedAttribute={selectedAttribute} parameterDescriptions={parameterDescriptions} onUpdateAttribute={updateAttribute} onClose={() => setSelectedAttribute(null)} onValueChange={(newValue) => setSelectedAttribute({ ...selectedAttribute, value: newValue })} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No XML File Loaded</h2>
            <p className="text-gray-500 mb-6">Upload XML files to start editing parameters. You can upload multiple files at once.</p>
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
              <Upload className="w-5 h-5" />Choose XML Files
            </button>
          </div>
        )}
        <AddElementDialog isOpen={!!showAddElement} onConfirm={handleAddElementConfirm} onCancel={() => setShowAddElement(false)} />
        <AddAttributeDialog isOpen={!!showAddAttribute} onConfirm={handleAddAttributeConfirm} onCancel={() => setShowAddAttribute(false)} />
      </div>
    </div>
  );
};

export default XMLEditor;