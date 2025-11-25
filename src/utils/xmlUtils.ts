// Simple XML parser function
export const parseXML = (xmlString: string): Document => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error('Invalid XML format');
  }
  
  return xmlDoc;
};

// Convert XML document to JSON-like structure (preserving root comments)
export const xmlDocumentToObject = (xmlDoc: Document): any => {
  const rootComments: string[] = [];
  
  // Capture comments before the root element
  for (const node of xmlDoc.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE) {
      rootComments.push(node.textContent || '');
    }
  }
  
  const rootElement = xmlDoc.documentElement;
  const obj = xmlToObject(rootElement);
  
  // Store root-level comments
  obj.rootComments = rootComments;
  
  return obj;
};

// Convert XML element to JSON-like structure
export const xmlToObject = (element: Element): any => {
  const obj: any = {
    tagName: element.tagName,
    attributes: {} as { [key: string]: string },
    children: [],
    textContent: ''
  };

  for (const attr of element.attributes) {
    obj.attributes[attr.name] = attr.value;
  }

  // Process all child nodes including comments, preserving order
  for (const node of element.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      obj.children.push(xmlToObject(node as Element));
    } else if (node.nodeType === Node.COMMENT_NODE) {
      // Store comments as special child objects
      obj.children.push({
        tagName: '__COMMENT__',
        commentText: node.textContent || '',
        attributes: {},
        children: []
      });
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() || '';
      if (text) {
        obj.textContent = text;
      }
    }
  }

  return obj;
};

// Convert object back to XML string
export const objectToXML = (obj: any, depth = 0): string => {
  const indent = '  '.repeat(depth);
  let xml = '';
  
  // Handle comment nodes
  if (obj.tagName === '__COMMENT__') {
    return `${indent}<!--${obj.commentText}-->\n`;
  }
  
  xml += `${indent}<${obj.tagName}`;
  
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
  
  // Add root-level comments at the bottom (only at depth 0)
  if (depth === 0 && obj.rootComments && obj.rootComments.length > 0) {
    for (const comment of obj.rootComments) {
      xml += `<!--${comment}-->\n`;
    }
  }
  
  return xml;
};

// Helper function to get element by path
export const getElementByPath = (obj: any, path: number[]): any => {
  let current = obj;
  for (const index of path) {
    current = current.children[index];
  }
  return current;
};
