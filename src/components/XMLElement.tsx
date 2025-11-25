import React, { useState } from 'react';
import { FileText, Info, Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';

interface XMLElementProps {
  element: any;
  path?: number[];
  parameterDescriptions: any;
  onAttributeClick: (elementPath: number[], attributeName: string, value: string) => void;
  onDeleteAttribute: (path: number[], attributeName: string) => void;
  onDeleteElement: (path: number[]) => void;
  onShowAddAttribute: (elementPath: number[], element: any) => void;
  onShowAddElement: (parentPath: number[], parentElement: any) => void;
}

const XMLElement: React.FC<XMLElementProps> = ({
  element,
  path = [],
  parameterDescriptions,
  onAttributeClick,
  onDeleteAttribute,
  onDeleteElement,
  onShowAddAttribute,
  onShowAddElement,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Skip comment nodes - don't display them
  if (element.tagName === '__COMMENT__') {
    return null;
  }
  const hasAttributes = Object.keys(element.attributes).length > 0;
  const hasChildren = element.children && element.children.length > 0;

  return (
    <div className="mb-2">
      <div className="border rounded-lg p-3 transition-colors border-gray-200 hover:border-gray-300">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-5" />}
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
              onClick={() => onShowAddAttribute(path, element)}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
              title="Add Attribute"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onShowAddElement(path, element)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
              title="Add Child Element"
            >
              <FileText className="w-4 h-4" />
            </button>
            {path.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this element?')) {
                    onDeleteElement(path);
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
                  onClick={() => onAttributeClick(path, key, String(value))}
                >
                  {String(value)}
                </span>
                {parameterDescriptions[key] && (
                  <Info className="w-3 h-3 text-blue-500 flex-shrink-0" />
                )}
                <button
                  onClick={() => {
                    if (window.confirm(`Delete attribute "${key}"?`)) {
                      onDeleteAttribute(path, key);
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
        
        {!isCollapsed && element.textContent && !hasChildren && (
          <div className="mt-2 p-2 bg-yellow-50 rounded">
            <span className="text-sm text-gray-600">Content: </span>
            <span className="text-sm text-gray-800">{element.textContent}</span>
          </div>
        )}
      </div>
      
      {!isCollapsed && hasChildren && (
        <div className={`mt-2 ${path.length > 0 ? 'ml-6 pl-2 border-l-2 border-gray-300' : ''}`}>
          {element.children.map((child: any, index: number) => (
            <XMLElement
              key={`${child.tagName}-${[...path, index].join('-')}`}
              element={child}
              path={[...path, index]}
              parameterDescriptions={parameterDescriptions}
              onAttributeClick={onAttributeClick}
              onDeleteAttribute={onDeleteAttribute}
              onDeleteElement={onDeleteElement}
              onShowAddAttribute={onShowAddAttribute}
              onShowAddElement={onShowAddElement}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default XMLElement;
