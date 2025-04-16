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
});
