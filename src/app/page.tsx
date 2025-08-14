'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, FileText, Info, Save, AlertCircle, CheckCircle, X, Plus, Trash2, Edit } from 'lucide-react';

const XMLEditor = () => {
  const [xmlData, setXmlData] = useState<any>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [parameterDescriptions, setParameterDescriptions] = useState<any>({});
  const [isLoadingDescriptions, setIsLoadingDescriptions] = useState(true);
  const [descriptionsError, setDescriptionsError] = useState<string | null>(null);
  const [descriptionsSource, setDescriptionsSource] = useState('');
  const [showJsonUpload, setShowJsonUpload] = useState<boolean>(false);
  const [showAddElement, setShowAddElement] = useState<any>(false);
  const [showAddAttribute, setShowAddAttribute] = useState<any>(false);
  const [newElementTagName, setNewElementTagName] = useState<string>('');
  const [newElementTextContent, setNewElementTextContent] = useState<string>('');
  const [newAttrName, setNewAttrName] = useState<string>('');
  const [newAttrValue, setNewAttrValue] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  // Load parameter descriptions from environment variable on mount
  useEffect(() => {
    const loadParameterDescriptions = async () => {
      const jsonFileLink = process.env.NEXT_PUBLIC_JSON_FILE_LINK;
      
      if (!jsonFileLink) {
        setDescriptionsError('No parameter descriptions configured');
        setIsLoadingDescriptions(false);
        setShowJsonUpload(true);
        return;
      }

      try {
        const response = await fetch(jsonFileLink);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        
        const descriptions = await response.json();
        setParameterDescriptions(descriptions);
        setDescriptionsError(null);
        setDescriptionsSource('env');
        setShowJsonUpload(false);
      } catch (error) {
        setDescriptionsError(`Failed to load from environment: ${error instanceof Error ? error.message : String(error)}`);
        setShowJsonUpload(true);
      } finally {
        setIsLoadingDescriptions(false);
      }
    };

    loadParameterDescriptions();
  }, []);

  // Handle manual JSON file upload
  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const descriptions = JSON.parse(e.target.result);
        setParameterDescriptions(descriptions);
        setDescriptionsError(null);
        setDescriptionsSource('manual');
        setShowJsonUpload(false);
      } catch (error: any) {
        alert('Error parsing JSON file: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  };

  // Simple XML parser function
  const parseXML = (xmlString: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      throw new Error('Invalid XML format');
    }
    
    return xmlDoc;
  };

  // Convert XML element to JSON-like structure
  const xmlToObject = (element: Element) => {
    const obj : any = {
      tagName: element.tagName,
      attributes: {} as { [key: string]: string },
      children: [],
      textContent: element.textContent?.trim() || ''
    };

    for (const attr of element.attributes) {
      obj.attributes[attr.name] = attr.value;
    }

    for (const child of element.children) {
      obj.children.push(xmlToObject(child));
    }

    return obj;
  };

  const handleXmlUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const xmlDoc = parseXML(e.target.result);
        const rootElement = xmlDoc.documentElement;
        const xmlObject = xmlToObject(rootElement);
        setXmlData(xmlObject);
        setSelectedElement(null);
        setSelectedAttribute(null);
      } catch (error: any) {
        alert('Error parsing XML: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  };

  // Convert object back to XML string
  const objectToXML = (obj: any, depth = 0) => {
    const indent = '  '.repeat(depth);
    let xml = `${indent}<${obj.tagName}`;
    
    for (const [key, value] of Object.entries(obj.attributes)) {
      xml += ` ${key}="${value}"`;
    }
    
    if (obj.children.length === 0 && !obj.textContent) {
      xml += ' />\n';
    } else {
      xml += '>';
      
      if (obj.textContent && obj.children.length === 0) {
        xml += obj.textContent;
      } else if (obj.children.length > 0) {
        xml += '\n';
        for (const child of obj.children) {
          xml += objectToXML(child, depth + 1);
        }
        xml += indent;
      }
      
      xml += `</${obj.tagName}>\n`;
    }
    
    return xml;
  };

  const downloadXML = () => {
    if (!xmlData) return;
    
    const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + objectToXML(xmlData);
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'modified_file.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Update element in nested structure
  const updateElement = (elementPath: number[], updates: Partial<Element>) => {
    const updateNestedObject = (obj: any, path: number[], newData: Partial<Element>) => {
      if (path.length === 0) {
        return { ...obj, ...newData };
      }
      
      const [currentIndex, ...remainingPath] = path;
      return {
        ...obj,
        children: obj.children.map((child: any, index: number) => 
          index === currentIndex 
            ? updateNestedObject(child, remainingPath, newData)
            : child
        )
      };
    };
    
    setXmlData(updateNestedObject(xmlData, elementPath, updates));
  };

  // Add new element
  const addElement = (parentPath: number[], newElement: any) => {
    const addToNestedObject = (obj: any, path: number[], element: any) => {
      if (path.length === 0) {
        return {
          ...obj,
          children: [...obj.children, element]
        };
      }
      
      const [currentIndex, ...remainingPath] = path;
      return {
        ...obj,
        children: obj.children.map((child: any, index: number) => 
          index === currentIndex 
            ? addToNestedObject(child, remainingPath, element)
            : child
        )
      };
    };
    
    setXmlData(addToNestedObject(xmlData, parentPath, newElement));
  };

  // Delete element
  const deleteElement = (elementPath: number[]) => {
    const deleteFromNestedObject = (obj: any, path: number[]) => {
      if (path.length === 1) {
        const indexToDelete = path[0];
        return {
          ...obj,
          children: obj.children.filter((_: any, index: number) => index !== indexToDelete)
        };
      }
      
      const [currentIndex, ...remainingPath] = path;
      return {
        ...obj,
        children: obj.children.map((child: any, index: number) => 
          index === currentIndex 
            ? deleteFromNestedObject(child, remainingPath)
            : child
        )
      };
    };
    
    setXmlData(deleteFromNestedObject(xmlData, elementPath));
  };

  const updateAttribute = (elementPath: number[], attributeName: string, newValue: string) => {
    const updates = {
      attributes: {
        ...getElementByPath(xmlData, elementPath).attributes,
        [attributeName]: newValue
      }
    };
    updateElement(elementPath, updates);
  };

  const addAttribute = (elementPath: number[], attributeName: string, attributeValue: string) => {
    const element = getElementByPath(xmlData, elementPath);
    const updates = {
      attributes: {
        ...element.attributes,
        [attributeName]: attributeValue
      }
    };
    updateElement(elementPath, updates);
  };

  const deleteAttribute = (elementPath: number[], attributeName: string) => {
    const element = getElementByPath(xmlData, elementPath);
    const newAttributes = { ...element.attributes };
    delete newAttributes[attributeName];
    
    const updates = {
      attributes: newAttributes
    };
    updateElement(elementPath, updates);
  };

  // Helper function to get element by path
  const getElementByPath = (obj: any, path: number[]) => {
    let current = obj;
    for (const index of path) {
      current = current.children[index];
    }
    return current;
  };

  const renderElement = (element: any, path: number[] = []) => {
    // Skip DataIdentifier elements as requested
    if (element.tagName === 'DataIdentifier') {
      return null;
    }

    const hasAttributes = Object.keys(element.attributes).length > 0;
    const isSelected = selectedElement && 
      JSON.stringify(selectedElement.path) === JSON.stringify(path);

    return (
      <div key={`${element.tagName}-${path.join('-')}`} className="mb-4">
        <div 
          className={`border rounded-lg p-4 transition-colors ${
            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-800">{element.tagName}</h3>
              {hasAttributes && (
                <span className="text-sm text-gray-500">
                  ({Object.keys(element.attributes).length} attributes)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddAttribute({ elementPath: path, element })}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
                title="Add Attribute"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowAddElement({ parentPath: path, parentElement: element })}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                title="Add Child Element"
              >
                <FileText className="w-4 h-4" />
              </button>
              {path.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this element?')) {
                      deleteElement(path);
                    }
                  }}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                  title="Delete Element"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {hasAttributes && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(element.attributes).map(([key, value]) => (
                <div 
                  key={key}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded group"
                >
                  <span className="text-sm font-medium text-gray-600 min-w-0">
                    {key}:
                  </span>
                  <span 
                    className="text-sm text-gray-800 truncate cursor-pointer hover:bg-gray-200 px-1 rounded flex-1"
                    onClick={() => setSelectedAttribute({ elementPath: path, attributeName: key, value })}
                  >
                    {String(value)}
                  </span>
                  {parameterDescriptions[key] && (
                    <Info className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete attribute "${key}"?`)) {
                        deleteAttribute(path, key);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-100 rounded transition-opacity"
                    title="Delete Attribute"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {element.textContent && (
            <div className="mt-2 p-2 bg-yellow-50 rounded">
              <span className="text-sm text-gray-600">Content: </span>
              <span className="text-sm text-gray-800">{element.textContent}</span>
            </div>
          )}
        </div>
        
        {element.children && element.children.length > 0 && (
          <div className="ml-4 mt-2">
            {element.children.map((child: any, index: number) => 
              renderElement(child, [...path, index])
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAttributeEditor = () => {
    if (!selectedAttribute) return null;
    
    const { elementPath, attributeName, value } = selectedAttribute;
    const description = parameterDescriptions[attributeName];
    
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
                value={value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  updateAttribute(elementPath, attributeName, newValue);
                  setSelectedAttribute({ ...selectedAttribute, value: newValue });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {description.options.map((option: any) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  updateAttribute(elementPath, attributeName, newValue);
                  setSelectedAttribute({ ...selectedAttribute, value: newValue });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Enter value..."
              />
            )}
          </div>
          
          <button
            onClick={() => setSelectedAttribute(null)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Done Editing
          </button>
        </div>
      </div>
    );
  };

  const renderAddElementDialog = () => {
    if (!showAddElement) return null;
    
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
                value={newElementTagName}
                onChange={(e) => setNewElementTagName(e.target.value)}
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
                value={newElementTextContent}
                onChange={(e) => setNewElementTextContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Element text content"
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                if (newElementTagName.trim()) {
                  const newElement = {
                    tagName: newElementTagName.trim(),
                    attributes: {},
                    children: [],
                    textContent: newElementTextContent.trim()
                  };
                  addElement(showAddElement.parentPath, newElement);
                  setShowAddElement(false);
                  setNewElementTagName('');
                  setNewElementTextContent('');
                }
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Element
            </button>
            <button
              onClick={() => {
                setShowAddElement(false);
                setNewElementTagName('');
                setNewElementTextContent('');
              }}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAddAttributeDialog = () => {
    if (!showAddAttribute) return null;
    
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
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
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
                value={newAttrValue}
                onChange={(e) => setNewAttrValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Attribute value"
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                if (newAttrName.trim()) {
                  addAttribute(showAddAttribute.elementPath, newAttrName.trim(), newAttrValue.trim());
                  setShowAddAttribute(false);
                  setNewAttrName('');
                  setNewAttrValue('');
                }
              }}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Add Attribute
            </button>
            <button
              onClick={() => {
                setShowAddAttribute(false);
                setNewAttrName('');
                setNewAttrValue('');
              }}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDescriptionsStatus = () => {
    if (isLoadingDescriptions) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium text-blue-800">Loading parameter descriptions...</span>
          </div>
        </div>
      );
    }

    if (descriptionsSource === 'env') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">
              Parameter descriptions loaded from environment ({Object.keys(parameterDescriptions).length} parameters)
            </span>
          </div>
        </div>
      );
    }

    if (descriptionsSource === 'manual') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                Parameter descriptions uploaded ({Object.keys(parameterDescriptions).length} parameters)
              </span>
            </div>
            <button
              onClick={() => {
                setParameterDescriptions({});
                setDescriptionsSource('');
                setShowJsonUpload(true);
              }}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    if (showJsonUpload) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Parameter Descriptions</span>
          </div>
          <p className="text-sm text-yellow-700 mb-3">
            {descriptionsError || 'Upload a JSON file with parameter descriptions to get detailed help when editing.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload JSON File
            </button>
            <button
              onClick={() => setShowJsonUpload(false)}
              className="text-sm text-yellow-700 hover:text-yellow-900"
            >
              Continue without descriptions
            </button>
          </div>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleJsonUpload}
            className="hidden"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">XML Parameter Editor</h1>
            
            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload XML File
              </button>
              
              {xmlData && (
                <>
                  <button
                    onClick={downloadXML}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Modified XML
                  </button>
                  
                  <button
                    onClick={() => setShowAddElement({ parentPath: [], parentElement: xmlData })}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Root Element
                  </button>
                </>
              )}
              
              {fileName && (
                <span className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">
                  File: {fileName}
                </span>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleXmlUpload}
              className="hidden"
            />
          </div>
        </div>
        
        {renderDescriptionsStatus()}
        
        {xmlData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">XML Structure</h2>
                <div className="max-h-96 overflow-y-auto">
                  {renderElement(xmlData)}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              {selectedAttribute ? (
                renderAttributeEditor()
              ) : (
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
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No XML File Loaded</h2>
            <p className="text-gray-500 mb-6">
              Upload an XML file to start editing parameters.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Upload className="w-5 h-5" />
              Choose XML File
            </button>
          </div>
        )}
        
        {renderAddElementDialog()}
        {renderAddAttributeDialog()}
      </div>
    </div>
  );
};

export default XMLEditor;