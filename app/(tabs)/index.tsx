import React, { useState, useEffect } from "react";
import {
  Platform,
  PermissionsAndroid,
  Alert,
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import DocumentScanner from "react-native-document-scanner-plugin";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PDFDocument } from "pdf-lib";

export default () => {
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [file, setFile] = useState<{
    uri: string;
    name: string;
    size: number;
    mimeType: string;
    data: Uint8Array | null;
  } | null>(null);

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

      const fileInfo = await FileSystem.getInfoAsync(pdfUri);
      setFile({
        uri: pdfUri,
        name: `scanned_document_${Date.now()}.pdf`,
        size: fileInfo.exists ? (fileInfo as any).size || 0 : 0,
        mimeType: "application/pdf",
        data: pdfBytes,
      });
      // await Sharing.shareAsync(pdfUri);

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
    <View style={tw`flex-1 justify-center items-center px-5 py-5`}>
      <Text style={tw`text-2xl font-bold mb-4`}>
        Camera Permission Required
      </Text>
      <Text style={tw`text-base text-center mb-6 text-gray-600`}>
        This app needs access to your camera to scan documents. Please grant the
        permission to continue.
      </Text>
      <TouchableOpacity
        style={tw`bg-blue-500 px-6 py-3 rounded-lg`}
        onPress={requestCameraPermission}
      >
        <Text style={tw`text-white font-semibold text-base`}>
          Grant Permission
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (hasPermission === false) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={tw`flex-1`}>
          <PermissionDeniedView />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={tw`flex-1`}>
        {scannedImages.length > 0 ? (
          <View style={tw`flex-1 justify-center items-center px-5`}>
            <View
              style={tw`flex-row justify-center py-5 bg-white border-t border-gray-200`}
            >
              <TouchableOpacity
                style={tw`bg-green-500 px-6 py-3 rounded-lg`}
                onPress={() => createPDF(scannedImages)}
              >
                <Text style={tw`text-white font-semibold text-base`}>
                  Export as PDF
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`bg-blue-500 px-6 py-3 rounded-lg ml-3`}
                onPress={scanDocument}
              >
                <Text style={tw`text-white font-semibold text-base`}>
                  Scan More
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={tw`flex-1 justify-center items-center px-5`}>
            <Text style={tw`text-2xl font-bold mb-4`}>Document Scanner</Text>
            <Text style={tw`text-base text-center mb-6 text-gray-600`}>
              {hasPermission === null
                ? "Checking camera permissions..."
                : "Ready to scan documents"}
            </Text>
            {hasPermission && (
              <View style={tw`items-center`}>
                <TouchableOpacity
                  style={tw`bg-blue-500 px-6 py-3 rounded-lg`}
                  onPress={scanDocument}
                >
                  <Text style={tw`text-white font-semibold text-base`}>
                    Scan Document
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};
