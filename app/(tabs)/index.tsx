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
} from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";

export default () => {
  const [scannedImage, setScannedImage] = useState<string | undefined>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Function to request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== "android") {
      // iOS handles permissions differently
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
    // First check/request permission
    const permissionGranted = await requestCameraPermission();

    if (!permissionGranted) {
      // Permission not granted, don't proceed
      return;
    }

    try {
      const { scannedImages } = await DocumentScanner.scanDocument();

      if (scannedImages && scannedImages.length > 0) {
        setScannedImage(scannedImages[0]);
      }
    } catch (error) {
      console.error("Error scanning document:", error);
      Alert.alert(
        "Scanning Error",
        "An error occurred while scanning. Please try again."
      );
    }
  };

  // Check permission on component mount
  useEffect(() => {
    const checkPermission = async () => {
      if (Platform.OS === "android") {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        setHasPermission(result);

        if (result) {
          // If we already have permission, scan immediately
          scanDocument();
        }
      } else {
        // For iOS, we'll assume permission is handled by the scanner
        setHasPermission(true);
        scanDocument();
      }
    };

    checkPermission();
  }, []);

  // Component to show when permission is denied
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

  // Main render
  if (hasPermission === false) {
    return <PermissionDeniedView />;
  }

  return scannedImage ? (
    <Image
      resizeMode="contain"
      style={{ width: "100%", height: "100%" }}
      source={{ uri: scannedImage }}
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
});
