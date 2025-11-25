import { useState, useEffect } from 'react';
import { parseXML, xmlDocumentToObject } from '@/utils/xmlUtils';

interface XMLFile {
  id: string;
  name: string;
  data: any;
  originalData?: any;
  changes: string[];
}

interface UseAPILoaderReturn {
  parameterDescriptions: any;
  isLoadingDescriptions: boolean;
  descriptionsError: string | null;
  xmlFiles: XMLFile[];
  isLoadingXMLs: boolean;
  xmlLoadError: string | null;
  setXmlFiles: React.Dispatch<React.SetStateAction<XMLFile[]>>;
}

const API_BASE_URL = 'https://abdrive.bajajauto.com/secure/user/file/download';
const API_TOKEN = 'Bearer $2y$10$cHek8vAlpqqGKgZi1dA7/OEwq1gM9JPVV9QWg3h7TfEoNXct6XS8S';

export const useAPILoader = (): UseAPILoaderReturn => {
  const [parameterDescriptions, setParameterDescriptions] = useState<any>({});
  const [isLoadingDescriptions, setIsLoadingDescriptions] = useState(true);
  const [descriptionsError, setDescriptionsError] = useState<string | null>(null);
  const [xmlFiles, setXmlFiles] = useState<XMLFile[]>([]);
  const [isLoadingXMLs, setIsLoadingXMLs] = useState(true);
  const [xmlLoadError, setXmlLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadParameterDescriptions = async () => {
      try {
        // First, get the file link from the API
        const folderPath = encodeURIComponent('/BALNOSTICS/XMLEditor');
        const folderResponse = await fetch(`${API_BASE_URL}?folder_path=${folderPath}`, {
          method: 'GET',
          headers: {
            'Authorization': API_TOKEN
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

    const loadXMLFilesFromAPI = async () => {
      try {
        const folderPath = encodeURIComponent('/BALNOSTICS/Prod_XMLs');
        const folderResponse = await fetch(`${API_BASE_URL}?folder_path=${folderPath}`, {
          method: 'GET',
          headers: {
            'Authorization': API_TOKEN
          }
        });

        if (!folderResponse.ok) {
          throw new Error(`Failed to fetch XML folder: ${folderResponse.status} ${folderResponse.statusText}`);
        }

        const folderData = await folderResponse.json();
        
        if (!folderData.status || !folderData.response?.file_links || folderData.response.file_links.length === 0) {
          throw new Error('No XML files found in the folder');
        }

        // Filter for XML files only
        const xmlFileLinks = folderData.response.file_links.filter((file: any) => 
          file.file_name.toLowerCase().endsWith('.xml')
        );

        if (xmlFileLinks.length === 0) {
          throw new Error('No XML files found in the Prod_XMLs folder');
        }

        console.log(`Found ${xmlFileLinks.length} XML files, loading...`);

        // Load all XML files
        const loadedFiles: XMLFile[] = [];
        for (const fileLink of xmlFileLinks) {
          try {
            const xmlResponse = await fetch(fileLink.link);
            if (!xmlResponse.ok) {
              console.warn(`Failed to load ${fileLink.file_name}`);
              continue;
            }

            const xmlText = await xmlResponse.text();
            const xmlDoc = parseXML(xmlText);
            const xmlObject = xmlDocumentToObject(xmlDoc);
            
            const fileId = Date.now().toString() + Math.random().toString(36);
            const newFile: XMLFile = { 
              id: fileId, 
              name: fileLink.file_name, 
              data: xmlObject,
              originalData: JSON.parse(JSON.stringify(xmlObject)),
              changes: []
            };
            loadedFiles.push(newFile);
          } catch (error) {
            console.warn(`Error parsing ${fileLink.file_name}:`, error);
          }
        }

        if (loadedFiles.length > 0) {
          setXmlFiles(loadedFiles);
          setXmlLoadError(null);
          console.log(`✓ Successfully loaded ${loadedFiles.length} XML files from API`);
        } else {
          throw new Error('Failed to parse any XML files');
        }
      } catch (error) {
        console.error('Error loading XML files from API:', error);
        setXmlLoadError('Failed to load XML files from API. You can upload files manually.');
      } finally {
        setIsLoadingXMLs(false);
      }
    };

    loadParameterDescriptions();
    loadXMLFilesFromAPI();
  }, []);

  return {
    parameterDescriptions,
    isLoadingDescriptions,
    descriptionsError,
    xmlFiles,
    isLoadingXMLs,
    xmlLoadError,
    setXmlFiles,
  };
};
