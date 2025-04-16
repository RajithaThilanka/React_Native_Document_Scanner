import React, { useState, useEffect } from "react";
import {
  Platform,
  PermissionsAndroid,
  Image,
  Alert,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PDFDocument } from "pdf-lib";

export default () => {
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [savedPDFs, setSavedPDFs] = useState<string[]>([]);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== "android") {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission Required",
          message: "This app needs access to your camera to scan documents",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );

      const permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasPermission(permissionGranted);
      return permissionGranted;
    } catch (err) {
      console.warn(err);
      setHasPermission(false);
      return false;
    }
  };

  const scanDocument = async () => {
    const permissionGranted = await requestCameraPermission();
    if (!permissionGranted) {
      return;
    }

    try {
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 20,
      });

      if (scannedImages && scannedImages.length > 0) {
        setScannedImages(scannedImages);
      }
    } catch (error) {
      console.error("Error scanning document:", error);
      Alert.alert(
        "Scanning Error",
        "An error occurred while scanning. Please try again."
      );
    }
  };

  useEffect(() => {
    const checkPermission = async () => {
      if (Platform.OS === "android") {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        setHasPermission(result);

        if (result) {
          scanDocument();
        }
      } else {
        setHasPermission(true);
        scanDocument();
      }
    };

    checkPermission();
  }, []);
  const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
    let binary = "";
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return global.btoa(binary);
  };
  const createPDF = async (images: string[]) => {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();

      // Add each image to the PDF
      for (const imagePath of images) {
        // Convert file:// URI to base64
        const imageBytes = await FileSystem.readAsStringAsync(imagePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const image = await pdfDoc.embedJpg(imageBytes);

        // Add a new page for this image
        const page = pdfDoc.addPage([image.width, image.height]);

        // Draw the image on the page
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      // Save the PDF
      const pdfBytes = await pdfDoc.save();

      // Write the PDF to a file
      const pdfUri = `${
        FileSystem.documentDirectory
      }scanned_document_${Date.now()}.pdf`;
      const base64Pdf = uint8ArrayToBase64(pdfBytes);
      await FileSystem.writeAsStringAsync(pdfUri, base64Pdf, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(pdfUri);

      return pdfUri;
    } catch (error) {
      const errorMessage = (error as Error).message || error;

      // Log the error to console
      console.error("Error creating PDF:", errorMessage);
      Alert.alert(
        "PDF Creation Error",
        `Could not create PDF from scanned images. Error: ${errorMessage}`
      );
    }
  };

  const PermissionDeniedView = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Permission Required</Text>
      <Text style={styles.message}>
        This app needs access to your camera to scan documents. Please grant the
        permission to continue.
      </Text>
      <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
        <Text style={styles.buttonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  if (hasPermission === false) {
    return <PermissionDeniedView />;
  }

  return scannedImages.length > 0 ? (
    <View style={{ flex: 1 }}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => createPDF(scannedImages)}
        >
          <Text style={styles.buttonText}>Export as PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { marginLeft: 10 }]}
          onPress={scanDocument}
        >
          <Text style={styles.buttonText}>Scan More</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={scannedImages}
        keyExtractor={(item, index) => `${item}-${index}`}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Image
            resizeMode="contain"
            style={styles.scannedImage}
            source={{ uri: item }}
          />
        )}
      />
    </View>
  ) : (
    <View style={styles.container}>
      <Text style={styles.title}>Document Scanner</Text>
      <Text style={styles.message}>
        {hasPermission === null
          ? "Checking camera permissions..."
          : "Ready to scan documents"}
      </Text>
      {hasPermission && (
        <TouchableOpacity style={styles.button} onPress={scanDocument}>
          <Text style={styles.buttonText}>Scan Document</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#555",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  scannedImage: {
    width: "100%",
    height: 300,
    marginBottom: 20,
    borderRadius: 8,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  listContainer: {
    padding: 10,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  exportButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
