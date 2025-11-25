'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Plus, FileText, Eye } from 'lucide-react';
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
}

const XMLEditor = () => {
  // Use custom hook for API data loading
  const {
    parameterDescriptions,
    isLoadingDescriptions,
    descriptionsError,
    xmlFiles,
    isLoadingXMLs,
    xmlLoadError,
    setXmlFiles,
  } = useAPILoader();

  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<any>(null);
  const [showAddElement, setShowAddElement] = useState<any>(false);
  const [showAddAttribute, setShowAddAttribute] = useState<any>(false);
  const [editingFileName, setEditingFileName] = useState<boolean>(false);
  const [showXMLViewer, setShowXMLViewer] = useState<boolean>(false);
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
    
    // Keep selectedAttribute open if the same element path and attribute exist in the new file
    if (selectedAttribute) {
      const newFile = xmlFiles.find(f => f.id === fileId);
      if (newFile) {
        try {
          const element = getElementByPath(newFile.data, selectedAttribute.elementPath);
          if (element && element.attributes && selectedAttribute.attributeName in element.attributes) {
            // Update the value to reflect the new file's value
            setSelectedAttribute({
              ...selectedAttribute,
              value: element.attributes[selectedAttribute.attributeName]
            });
          } else {
            // Element path or attribute doesn't exist in new file, close editor
            setSelectedAttribute(null);
          }
        } catch (error) {
          // Element path doesn't exist in new file, close editor
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
        
        {/* XML Loading Status */}
        {isLoadingXMLs && (
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-800">Loading XML files from API...</span>
            </div>
          </div>
        )}
        
        {xmlLoadError && (
          <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-yellow-800">⚠️ {xmlLoadError}</span>
            </div>
          </div>
        )}
        
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
                    <div className="flex items-center gap-2 flex-1">
                      <h2 
                        className="text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => setEditingFileName(true)}
                        title="Click to edit filename"
                      >
                        {fileName}
                      </h2>
                      {fileChanges.length > 0 && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Modified
                        </span>
                      )}
                    </div>
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
        ) : !isLoadingXMLs ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No XML File Loaded</h2>
            <p className="text-gray-500 mb-6">
              {xmlLoadError 
                ? 'Could not load XML files from API. Upload XML files manually to start editing parameters.' 
                : 'Upload XML files to start editing parameters. You can upload multiple files at once.'}
            </p>
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
              <Upload className="w-5 h-5" />Choose XML Files
            </button>
          </div>
        ) : null}
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