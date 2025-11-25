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

// Convert XML element to JSON-like structure
export const xmlToObject = (element: Element): any => {
  const obj: any = {
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

// Convert object back to XML string
export const objectToXML = (obj: any, depth = 0): string => {
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

// Helper function to get element by path
export const getElementByPath = (obj: any, path: number[]): any => {
  let current = obj;
  for (const index of path) {
    current = current.children[index];
  }
  return current;
};
