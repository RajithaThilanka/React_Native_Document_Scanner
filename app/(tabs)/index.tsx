import React, { useState, useEffect } from "react";
import { Platform, PermissionsAndroid, Image, Alert } from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";

export default () => {
  const [scannedImage, setScannedImage] = useState<string | undefined>();

  const scanDocument = async () => {
    if (
      Platform.OS === "android" &&
      (await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      )) !== PermissionsAndroid.RESULTS.GRANTED
    ) {
      Alert.alert(
        "Error",
        "User must grant camera permissions to use document scanner."
      );
      return;
    }

    const { scannedImages } = await DocumentScanner.scanDocument();

    if (scannedImages) {
      if (scannedImages.length > 0) {
        setScannedImage(scannedImages[0]);
      }
    }
  };

  useEffect(() => {
    scanDocument();
  }, []);

  return (
    <Image
      resizeMode="contain"
      style={{ width: "100%", height: "100%" }}
      source={{ uri: scannedImage }}
    />
  );
};
