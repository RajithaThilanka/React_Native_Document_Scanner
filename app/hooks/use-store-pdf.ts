import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { FileData } from "../app.types";

const useStorePdf = () => {
  const storePdfToSecureStorage = async (pdfData: FileData): Promise<void> => {
    try {
      const pdfMetadata = JSON.stringify({
        uri: pdfData.uri,
        name: pdfData.name,
        size: pdfData.size,
        mimeType: pdfData.mimeType,
        createdAt: new Date().toISOString(),
      });

      await SecureStore.setItemAsync("latest_pdf_metadata", pdfMetadata);
    } catch (error) {
      console.error("Error storing PDF in SecureStore:", error);
      Alert.alert("Storage Error", "Could not save PDF to secure storage.");
    }
  };

  return { storePdfToSecureStorage };
};

export default useStorePdf;
