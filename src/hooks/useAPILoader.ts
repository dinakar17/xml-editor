import { useState, useEffect } from "react";
import { FMSApi } from "@/api/fms";
import { fetch } from "@tauri-apps/plugin-http";
import { parseXML, xmlDocumentToObject } from "@/utils/xmlUtils";

interface XMLFile {
  id: string;
  name: string;
  data: any;
  originalData?: any;
  changes: string[];
  partNumber?: string;
}

interface UseAPILoaderReturn {
  parameterDescriptions: any;
  isLoadingDescriptions: boolean;
  descriptionsError: string | null;
  xmlFiles: XMLFile[];
  isLoadingPartNumber: boolean;
  loadPartNumberError: string | null;
  setXmlFiles: React.Dispatch<React.SetStateAction<XMLFile[]>>;
  loadXMLsByPartNumber: (partNo: string) => Promise<void>;
}

const API_BASE_URL = "https://abdrive.bajajauto.com/secure/user/file/download";
const API_TOKEN =
  "Bearer $2y$10$cHek8vAlpqqGKgZi1dA7/OEwq1gM9JPVV9QWg3h7TfEoNXct6XS8S";

export const useAPILoader = (): UseAPILoaderReturn => {
  const [parameterDescriptions, setParameterDescriptions] = useState<any>({});
  const [isLoadingDescriptions, setIsLoadingDescriptions] = useState(true);
  const [descriptionsError, setDescriptionsError] = useState<string | null>(
    null
  );
  const [xmlFiles, setXmlFiles] = useState<XMLFile[]>([]);

  const [isLoadingPartNumber, setIsLoadingPartNumber] = useState(false);
  const [loadPartNumberError, setLoadPartNumberError] = useState<string | null>(
    null
  );

  // Function to load XMLs by part number
  const loadXMLsByPartNumber = async (partNo: string) => {
    setIsLoadingPartNumber(true);
    setLoadPartNumberError(null);

    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Not authenticated. Please login first.");
      }

      // Build URL with query params
      const url = new URL("/api/v4/ecu/details", window.location.origin);
      url.searchParams.append("part_no", partNo);

      // Fetch ECU details using FMSApi
      const response = await FMSApi({
        url: url.pathname + url.search,
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      if (
        !responseData.status ||
        !responseData.data ||
        responseData.data.length === 0
      ) {
        throw new Error(`No ECU details found for part number: ${partNo}`);
      }

      const ecuData = responseData.data[0];
      const loadedFiles: XMLFile[] = [];

      // Load UDS DID List XML
      if (ecuData.uds_did_list_xml_download_link) {
        try {
          const xmlResponse = await fetch(
            ecuData.uds_did_list_xml_download_link
          );
          if (xmlResponse.ok) {
            const xmlText = await xmlResponse.text();
            const xmlDoc = parseXML(xmlText);
            const xmlObject = xmlDocumentToObject(xmlDoc);

            const fileId = Date.now().toString() + Math.random().toString(36);
            loadedFiles.push({
              id: fileId,
              name: `${ecuData.ECU_name}_${partNo}_UDS_DID_List.xml`,
              data: xmlObject,
              originalData: JSON.parse(JSON.stringify(xmlObject)),
              changes: [],
              partNumber: partNo,
            });
          }
        } catch (error) {
          console.warn("Failed to load UDS DID List XML:", error);
        }
      }

      // Load UDS Fault List XML
      if (ecuData.uds_fault_list_xml_download_link) {
        try {
          const xmlResponse = await fetch(
            ecuData.uds_fault_list_xml_download_link
          );
          if (xmlResponse.ok) {
            const xmlText = await xmlResponse.text();
            const xmlDoc = parseXML(xmlText);
            const xmlObject = xmlDocumentToObject(xmlDoc);

            const fileId = Date.now().toString() + Math.random().toString(36);
            loadedFiles.push({
              id: fileId,
              name: `${ecuData.ECU_name}_${partNo}_UDS_Fault_List.xml`,
              data: xmlObject,
              originalData: JSON.parse(JSON.stringify(xmlObject)),
              changes: [],
              partNumber: partNo,
            });
          }
        } catch (error) {
          console.warn("Failed to load UDS Fault List XML:", error);
        }
      }

      // Load UDS PID List XML
      if (ecuData.uds_pid_list_xml_download_link) {
        try {
          const xmlResponse = await fetch(
            ecuData.uds_pid_list_xml_download_link
          );
          if (xmlResponse.ok) {
            const xmlText = await xmlResponse.text();
            const xmlDoc = parseXML(xmlText);
            const xmlObject = xmlDocumentToObject(xmlDoc);

            const fileId = Date.now().toString() + Math.random().toString(36);
            loadedFiles.push({
              id: fileId,
              name: `${ecuData.ECU_name}_${partNo}_UDS_PID_List.xml`,
              data: xmlObject,
              originalData: JSON.parse(JSON.stringify(xmlObject)),
              changes: [],
              partNumber: partNo,
            });
          }
        } catch (error) {
          console.warn("Failed to load UDS PID List XML:", error);
        }
      }

      if (loadedFiles.length > 0) {
        setXmlFiles((prev) => [...prev, ...loadedFiles]);
        console.log(
          `✓ Successfully loaded ${loadedFiles.length} XML file(s) for part ${partNo}`
        );
      } else {
        throw new Error(`No XML files available for part number: ${partNo}`);
      }
    } catch (error: any) {
      console.error("Error loading XML files by part number:", error.message);
      setLoadPartNumberError(error.message || "Failed to load XML files");
      throw error;
    } finally {
      setIsLoadingPartNumber(false);
    }
  };

  useEffect(() => {
    const loadParameterDescriptions = async () => {
      try {
        // First, get the file link from the API
        const folderPath = encodeURIComponent("/BALNOSTICS/XMLEditor");
        const folderUrl = `${API_BASE_URL}?folder_path=${folderPath}`;

        const folderResponse = await fetch(folderUrl, {
          method: "GET",
          headers: {
            Authorization: API_TOKEN,
          },
        });

        if (!folderResponse.ok) {
          throw new Error(
            `Failed to fetch folder contents: ${folderResponse.status} ${folderResponse.statusText}`
          );
        }

        const folderData = await folderResponse.json();

        if (
          !folderData.status ||
          !folderData.response?.file_links ||
          folderData.response.file_links.length === 0
        ) {
          throw new Error("No files found in the folder");
        }

        // Get the first JSON file (or the specific did_xml_params.json)
        const jsonFile =
          folderData.response.file_links.find((file: any) =>
            file.file_name.endsWith(".json")
          ) || folderData.response.file_links[0];

        if (!jsonFile) {
          throw new Error("No JSON file found in the response");
        }

        // Now fetch the actual JSON content from the link
        const descriptionsResponse = await fetch(jsonFile.link);

        if (!descriptionsResponse.ok) {
          throw new Error(
            `Failed to fetch descriptions: ${descriptionsResponse.status} ${descriptionsResponse.statusText}`
          );
        }

        const descriptions = await descriptionsResponse.json();
        setParameterDescriptions(descriptions);
        setDescriptionsError(null);
        console.log("✓ Parameter descriptions loaded from API");
      } catch (error) {
        console.error("Error loading parameter descriptions:", error);
        // Silently fallback to local file if API fails
        try {
          const localResponse = await fetch("/config/did_xml_params.json");
          if (localResponse.ok) {
            const descriptions = await localResponse.json();
            setParameterDescriptions(descriptions);
            setDescriptionsError(null);
            console.log(
              "✓ Parameter descriptions loaded from local file (API fallback)"
            );
          } else {
            setDescriptionsError(
              "Failed to load parameter descriptions from both API and local file"
            );
          }
        } catch (localError) {
          setDescriptionsError("Failed to load parameter descriptions");
        }
      } finally {
        setIsLoadingDescriptions(false);
      }
    };

    loadParameterDescriptions();
  }, []);

  return {
    parameterDescriptions,
    isLoadingDescriptions,
    descriptionsError,
    xmlFiles,
    isLoadingPartNumber,
    loadPartNumberError,
    setXmlFiles,
    loadXMLsByPartNumber,
  };
};
