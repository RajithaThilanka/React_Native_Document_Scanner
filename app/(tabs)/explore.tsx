import React, { useState, useEffect, ReactNode } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Application from "expo-application";
import * as Updates from "expo-updates";

interface PDFMetadata {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  children?: ReactNode;
  danger?: boolean;
}

export default function SettingsPage() {
  const deviceTheme = useColorScheme();
  const isDarkMode = deviceTheme === "dark";
  const [totalStorage, setTotalStorage] = useState<string>("0 KB");
  const [appVersion, setAppVersion] = useState<string>("1.0.0");
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] =
    useState<boolean>(false);
  const [followSystem, setFollowSystem] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDarkMode);

  const colors = {
    background: isDarkMode ? "bg-gray-900" : "bg-gray-50",
    card: isDarkMode ? "bg-gray-800" : "bg-white",
    text: isDarkMode ? "text-white" : "text-gray-800",
    subtext: isDarkMode ? "text-gray-400" : "text-gray-500",
    primary: "bg-blue-600",
    border: isDarkMode ? "border-gray-700" : "border-gray-200",
  };

  useEffect(() => {
    calculateStorage();
    getAppVersion();
  }, []);

  const getAppVersion = async () => {
    try {
      const version = Application.nativeApplicationVersion || "1.0.0";
      const build = Application.nativeBuildVersion || "1";
      setAppVersion(Platform.OS === "ios" ? `${version} (${build})` : version);
    } catch (error) {
      console.error("Error getting app version:", error);
      setAppVersion("1.0.0");
    }
  };

  const calculateStorage = async () => {
    try {
      setIsCalculating(true);
      const existingPdfsString = await SecureStore.getItemAsync(
        "all_pdf_files"
      );
      if (!existingPdfsString) {
        setTotalStorage("0 KB");
        return;
      }

      const existingPdfs: PDFMetadata[] = JSON.parse(existingPdfsString);
      let totalSize = 0;
      for (const pdf of existingPdfs) totalSize += pdf.size;

      const formattedSize =
        totalSize > 1024 * 1024
          ? `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
          : `${(totalSize / 1024).toFixed(2)} KB`;

      setTotalStorage(formattedSize);
    } catch (error) {
      console.error("Error calculating storage:", error);
      setTotalStorage("Error");
    } finally {
      setIsCalculating(false);
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete all scanned documents? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              const existingPdfsString = await SecureStore.getItemAsync(
                "all_pdf_files"
              );
              if (existingPdfsString) {
                const existingPdfs: PDFMetadata[] =
                  JSON.parse(existingPdfsString);
                for (const pdf of existingPdfs) {
                  await FileSystem.deleteAsync(pdf.uri, { idempotent: true });
                }
              }
              await SecureStore.deleteItemAsync("all_pdf_files");
              await SecureStore.deleteItemAsync("latest_pdf_metadata");
              setTotalStorage("0 KB");
              Alert.alert("Success", "All data has been cleared.");
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert("Error", "Failed to clear all data.");
            }
          },
        },
      ]
    );
  };

  const exportAllPDFs = async () => {
    try {
      const existingPdfsString = await SecureStore.getItemAsync(
        "all_pdf_files"
      );
      if (!existingPdfsString)
        return Alert.alert("No PDFs", "No PDFs found to export");

      const existingPdfs: PDFMetadata[] = JSON.parse(existingPdfsString);
      if (existingPdfs.length === 0)
        return Alert.alert("No PDFs", "No PDFs found to export");

      if (existingPdfs.length === 1) {
        await Sharing.shareAsync(existingPdfs[0].uri);
      } else {
        Alert.alert(
          "Export PDFs",
          "Each PDF will be shared individually. Continue?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Continue",
              onPress: async () => {
                for (const pdf of existingPdfs) {
                  await Sharing.shareAsync(pdf.uri);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error exporting PDFs:", error);
      Alert.alert("Export Error", "Failed to export PDFs");
    }
  };

  const checkForUpdates = async () => {
    try {
      setIsCheckingForUpdate(true);
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert("Update Available", "A new version has been downloaded.", [
          { text: "Later", style: "cancel" },
          { text: "Restart Now", onPress: () => Updates.reloadAsync() },
        ]);
      } else {
        Alert.alert("Up to Date", "You're running the latest version.");
      }
    } catch (error) {
      Alert.alert("Update Error", "Could not check for updates.");
    } finally {
      setIsCheckingForUpdate(false);
    }
  };

  const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    label,
    value,
    onPress,
    children,
    danger = false,
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={tw`flex-row items-center justify-between ${colors.card} p-4 mb-2 rounded-lg shadow-sm`}
    >
      <View style={tw`flex-row items-center`}>
        <View style={tw`p-2 mr-3 rounded-lg bg-blue-100`}>
          <Ionicons
            name={icon}
            size={18}
            color={danger ? "#ef4444" : "#3b82f6"}
          />
        </View>
        <Text style={tw`font-medium ${danger ? "text-red-500" : colors.text}`}>
          {label}
        </Text>
      </View>
      {children ? (
        children
      ) : value ? (
        <Text style={tw`${colors.subtext}`}>{value}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={tw`flex-1 ${colors.background}`}>
      <View style={tw`p-4`}>
        <Text style={tw`text-white text-xl font-bold`}>Settings</Text>
      </View>

      <ScrollView style={tw`p-4`}>
        <Text style={tw`${colors.subtext} text-xs mb-2`}>Appearance</Text>
        <SettingItem icon="color-palette-outline" label="Dark Mode">
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: "#767577", true: "#2563eb" }}
            thumbColor={darkModeEnabled ? "#ffffff" : "#f4f3f4"}
          />
        </SettingItem>

        <SettingItem icon="phone-portrait-outline" label="Follow System Theme">
          <Switch
            value={followSystem}
            onValueChange={() => setFollowSystem(!followSystem)}
            trackColor={{ false: "#767577", true: "#2563eb" }}
            thumbColor={followSystem ? "#ffffff" : "#f4f3f4"}
          />
        </SettingItem>

        <Text style={tw`${colors.subtext} text-xs mt-6 mb-2`}>Storage</Text>
        <SettingItem
          icon="save-outline"
          label="Storage Used"
          value={isCalculating ? "Calculating..." : totalStorage}
        />
        <SettingItem
          icon="cloud-upload-outline"
          label="Export All Documents"
          onPress={exportAllPDFs}
        />

        <Text style={tw`${colors.subtext} text-xs mt-6 mb-2`}>Application</Text>
        <SettingItem
          icon="information-circle-outline"
          label="App Version"
          value={appVersion}
        />
        <SettingItem icon="refresh-outline" label="Check for Updates">
          {isCheckingForUpdate ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <TouchableOpacity onPress={checkForUpdates}>
              <Text style={tw`text-blue-500 font-semibold`}>Check</Text>
            </TouchableOpacity>
          )}
        </SettingItem>

        <Text style={tw`${colors.subtext} text-xs mt-6 mb-2`}>Danger Zone</Text>
        <SettingItem
          icon="trash-outline"
          label="Clear All Data"
          onPress={clearAllData}
          danger
        />
      </ScrollView>
    </SafeAreaView>
  );
}
