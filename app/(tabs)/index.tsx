import React, { useState, useEffect } from "react";
import {
  Platform,
  PermissionsAndroid,
  Alert,
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
  Image,
  FlatList,
  useColorScheme,
  Switch,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import DocumentScanner from "react-native-document-scanner-plugin";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PDFDocument } from "pdf-lib";
import { FileData, ThemeColors } from "../app.types";
import useStorePdf from "../hooks/use-store-pdf";

export default () => {
  const deviceTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(deviceTheme === "dark");

  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [file, setFile] = useState<FileData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedView, setSelectedView] = useState<"grid" | "list">("grid");
  const { storePdfToSecureStorage } = useStorePdf();

  const colors: ThemeColors = isDarkMode
    ? {
        background: "bg-gray-900",
        card: "bg-gray-800",
        text: "text-white",
        subtext: "text-gray-400",
        border: "border-gray-700",
        primary: "bg-blue-600",
        primaryDark: "bg-blue-800",
        accent: "bg-green-600",
        danger: "text-red-400",
        dangerBg: "bg-red-900 bg-opacity-30",
        statusBar: "#1f2937",
        headerBg: "bg-gray-800",
        headerText: "text-white",
      }
    : {
        background: "bg-gray-50",
        card: "bg-white",
        text: "text-gray-800",
        subtext: "text-gray-500",
        border: "border-gray-200",
        primary: "bg-blue-600",
        primaryDark: "bg-blue-800",
        accent: "bg-green-600",
        danger: "text-red-500",
        dangerBg: "bg-red-50",
        statusBar: "#2563eb",
        headerBg: "bg-blue-800",
        headerText: "text-white",
      };

  const toggleTheme = (): void => {
    setIsDarkMode((prev) => !prev);
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;

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

  const scanDocument = async (): Promise<void> => {
    const permissionGranted = await requestCameraPermission();
    if (!permissionGranted) return;

    try {
      setIsProcessing(true);
      // Type assertion for DocumentScanner response
      const { scannedImages: images } = (await DocumentScanner.scanDocument({
        maxNumDocuments: 20,
        croppedImageQuality: 100,
      })) as { scannedImages: string[] };

      if (images && images.length > 0) {
        setScannedImages((prevImages) => [...prevImages, ...images]);
      }
    } catch (error) {
      console.error("Error scanning document:", error);
      Alert.alert(
        "Scanning Error",
        "An error occurred while scanning. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const checkPermission = async (): Promise<void> => {
      if (Platform.OS === "android") {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        setHasPermission(result);
      } else {
        setHasPermission(true);
      }
    };

    checkPermission();
  }, []);

  // Update theme based on device settings
  useEffect(() => {
    setIsDarkMode(deviceTheme === "dark");
  }, [deviceTheme]);

  const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
    let binary = "";
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return global.btoa(binary);
  };

  const createPDF = async (images: string[]): Promise<string | undefined> => {
    try {
      setIsProcessing(true);
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
      const fileName = `scanned_document_${Date.now()}.pdf`;
      const pdfUri = `${FileSystem.documentDirectory}${fileName}`;
      const base64Pdf = uint8ArrayToBase64(pdfBytes);
      await FileSystem.writeAsStringAsync(pdfUri, base64Pdf, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileInfo = await FileSystem.getInfoAsync(pdfUri);

      const pdfData = {
        uri: pdfUri,
        name: fileName,
        size: fileInfo.exists ? (fileInfo as any).size || 0 : 0,
        mimeType: "application/pdf",
        data: pdfBytes,
      };

      setFile(pdfData);

      // Store PDF to SecureStore and navigate to library
      await storePdfToSecureStorage(pdfData);

      Alert.alert(
        "PDF Created Successfully",
        "Your document has been converted to PDF.",
        [
          { text: "OK" },
          {
            text: "Share",
            onPress: () => sharePDF(pdfUri),
          },
        ]
      );

      return pdfUri;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error creating PDF:", errorMessage);
      Alert.alert(
        "PDF Creation Error",
        `Could not create PDF from scanned images. Error: ${errorMessage}`
      );
      return undefined;
    } finally {
      setIsProcessing(false);
    }
  };

  const sharePDF = async (pdfUri: string): Promise<void> => {
    try {
      await Sharing.shareAsync(pdfUri);
    } catch (error) {
      console.error("Error sharing PDF:", error);
      Alert.alert("Sharing Error", "Could not share the PDF file.");
    }
  };

  const removeImage = (index: number): void => {
    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const newImages = [...scannedImages];
          newImages.splice(index, 1);
          setScannedImages(newImages);
        },
      },
    ]);
  };

  const clearAllImages = (): void => {
    if (scannedImages.length === 0) return;

    Alert.alert(
      "Clear All",
      "Are you sure you want to remove all scanned images?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            setScannedImages([]);
            setFile(null);
          },
        },
      ]
    );
  };

  const Header = (): JSX.Element => (
    <View style={tw`${colors.headerBg} pt-2 pb-4 px-4 shadow-lg`}>
      <StatusBar
        backgroundColor={colors.statusBar}
        barStyle={isDarkMode ? "light-content" : "light-content"}
      />
      <View style={tw`flex-row justify-between items-center mt-2`}>
        <Text style={tw`${colors.headerText} text-xl font-bold`}>
          React Native Document Scanner
        </Text>
        <View style={tw`flex-row items-center`}>
          <View style={tw`flex-row items-center mr-4`}>
            <Text style={tw`${colors.headerText} mr-2`}>
              {isDarkMode ? "🌙" : "☀️"}
            </Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: "#767577", true: "#2563eb" }}
              thumbColor={isDarkMode ? "#ffffff" : "#f4f3f4"}
            />
          </View>
          {scannedImages.length > 0 && (
            <TouchableOpacity onPress={clearAllImages}>
              <Text style={tw`${colors.headerText}`}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {scannedImages.length > 0 && (
        <View style={tw`flex-row mt-3 items-center justify-between`}>
          <View style={tw`flex-row`}>
            <TouchableOpacity
              style={tw`${
                selectedView === "grid" ? "bg-blue-700" : "bg-transparent"
              } px-3 py-1 mr-2 rounded-full`}
              onPress={() => setSelectedView("grid")}
            >
              <Text style={tw`${colors.headerText}`}>Grid</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`${
                selectedView === "list" ? "bg-blue-700" : "bg-transparent"
              } px-3 py-1 rounded-full`}
              onPress={() => setSelectedView("list")}
            >
              <Text style={tw`${colors.headerText}`}>List</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={tw`px-4 py-2 rounded bg-red-100`}
            onPress={clearAllImages}
          >
            <Text style={tw`text-red-500 font-semibold`}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const PermissionDeniedView = (): JSX.Element => (
    <View
      style={tw`flex-1 justify-center items-center px-5 py-5 ${colors.background}`}
    >
      <Text style={tw`text-2xl font-bold mb-4 ${colors.text}`}>
        Camera Permission Required
      </Text>
      <Text style={tw`text-base text-center mb-6 ${colors.subtext}`}>
        This app needs access to your camera to scan documents. Please grant the
        permission to continue.
      </Text>
      <TouchableOpacity
        style={tw`${colors.primary} px-6 py-3 rounded-lg`}
        onPress={requestCameraPermission}
      >
        <Text style={tw`text-white font-semibold text-base`}>
          Grant Permission
        </Text>
      </TouchableOpacity>
    </View>
  );

  const EmptyStateView = (): JSX.Element => (
    <View
      style={tw`flex-1 justify-center items-center px-5 ${colors.background}`}
    >
      <View style={tw`items-center mb-8`}>
        <View
          style={tw`${
            isDarkMode ? "bg-blue-900" : "bg-blue-100"
          } p-6 rounded-full mb-4`}
        >
          <Text
            style={tw`${
              isDarkMode ? "text-blue-200" : "text-blue-800"
            } text-4xl`}
          >
            📄
          </Text>
        </View>
        <Text style={tw`text-2xl font-bold ${colors.text} mb-2`}>
          Scan Documents
        </Text>
        <Text style={tw`text-base text-center mb-6 ${colors.subtext} px-8`}>
          Capture high-quality scans of documents, receipts, notes, and more
        </Text>
      </View>

      <TouchableOpacity
        style={tw`${colors.primary} px-6 py-4 rounded-lg w-64 items-center shadow-md`}
        onPress={scanDocument}
        disabled={isProcessing}
      >
        <Text style={tw`text-white font-bold text-lg`}>
          {isProcessing ? "Processing..." : "Start Scanning"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  interface RenderItemProps {
    item: string;
    index: number;
  }

  const GridView = (): JSX.Element => (
    <View style={tw`flex-1`}>
      <FlatList
        data={scannedImages}
        numColumns={2}
        contentContainerStyle={tw`p-2`}
        style={tw`${colors.background}`}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }: RenderItemProps) => (
          <View style={tw`w-1/2 p-1`}>
            <View
              style={tw`${colors.card} rounded-lg shadow overflow-hidden ${colors.border}`}
            >
              <TouchableOpacity onLongPress={() => removeImage(index)}>
                <Image
                  source={{ uri: item }}
                  style={tw`h-40 w-full`}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <View style={tw`p-2 flex-row justify-between items-center`}>
                <Text style={tw`text-xs ${colors.subtext}`}>
                  Page {index + 1}
                </Text>
                <TouchableOpacity onPress={() => removeImage(index)}>
                  <Text style={tw`${colors.danger} text-xs`}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );

  const ListView = (): JSX.Element => (
    <View style={tw`flex-1`}>
      <FlatList
        data={scannedImages}
        contentContainerStyle={tw`p-2`}
        style={tw`${colors.background}`}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }: RenderItemProps) => (
          <View
            style={tw`mb-3 ${colors.card} rounded-lg shadow-md overflow-hidden`}
          >
            <View style={tw`flex-row`}>
              <Image
                source={{ uri: item }}
                style={tw`h-24 w-24`}
                resizeMode="cover"
              />
              <View style={tw`p-3 flex-1 justify-between`}>
                <View>
                  <Text style={tw`font-bold ${colors.text}`}>
                    Page {index + 1}
                  </Text>
                  <Text style={tw`text-xs ${colors.subtext} mt-1`}>
                    Tap and hold to preview
                  </Text>
                </View>
                <TouchableOpacity
                  style={tw`${colors.dangerBg} px-2 py-1 rounded self-start`}
                  onPress={() => removeImage(index)}
                >
                  <Text style={tw`${colors.danger} text-xs`}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderPDFDetails = (): JSX.Element | null => {
    if (!file) return null;

    return (
      <View style={tw`p-4 ${colors.card} rounded-lg shadow-md mx-4 mb-4 mt-4`}>
        <Text style={tw`text-lg font-bold mb-2 ${colors.text}`}>
          PDF Created
        </Text>
        <View
          style={tw`flex-row items-center justify-between border-t ${colors.border} pt-2`}
        >
          <View style={tw`flex-1`}>
            <Text style={tw`${colors.subtext} text-xs`}>Filename</Text>
            <Text style={tw`${colors.text}`} numberOfLines={1}>
              {file.name}
            </Text>
          </View>
          <Text style={tw`${colors.subtext} text-sm`}>
            {(file.size / 1024).toFixed(1)} KB
          </Text>
        </View>
        <View style={tw`flex-row justify-end mt-3`}>
          <TouchableOpacity
            style={tw`${colors.primary} px-4 py-2 rounded-lg`}
            onPress={() => sharePDF(file.uri)}
          >
            <Text style={tw`text-white font-semibold`}>Share PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const FloatingActionButton = (): JSX.Element => (
    <View style={tw`absolute bottom-6 right-0 left-0 flex-row justify-center`}>
      <View
        style={tw`flex-row ${
          isDarkMode ? "bg-gray-700" : "bg-white"
        } rounded-full shadow-lg`}
      >
        {scannedImages.length > 0 && (
          <TouchableOpacity
            style={tw`${colors.accent} px-5 py-3 rounded-l-full`}
            onPress={() => createPDF(scannedImages)}
            disabled={isProcessing}
          >
            <Text style={tw`text-white font-bold`}>
              {isProcessing ? "Processing..." : "Create PDF"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={tw`${colors.primary} ${
            scannedImages.length > 0 ? "rounded-r-full" : "rounded-full"
          } px-5 py-3`}
          onPress={scanDocument}
          disabled={isProcessing}
        >
          <Text style={tw`text-white font-bold`}>
            {scannedImages.length > 0 ? "Scan More" : "Scan Document"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (hasPermission === false) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={tw`flex-1 ${colors.background}`}>
          <Header />
          <PermissionDeniedView />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={tw`flex-1 ${colors.background}`}>
        <Header />

        {scannedImages.length > 0 ? (
          <View style={tw`flex-1 ${colors.background}`}>
            {file && renderPDFDetails()}
            <View style={tw`flex-1`}>
              {selectedView === "grid" ? <GridView /> : <ListView />}
            </View>
            <FloatingActionButton />
          </View>
        ) : (
          <EmptyStateView />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};
