import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useThemeContext } from "@/context/themeContext";

interface PDFMetadata {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export default function LibraryPage() {
  const { colors, isDarkMode } = useThemeContext();

  const [pdfFiles, setPdfFiles] = useState<PDFMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchPdfFiles();
    }, [])
  );

  const fetchPdfFiles = async () => {
    try {
      setIsLoading(true);
      const pdfMetadataString = await SecureStore.getItemAsync(
        "latest_pdf_metadata"
      );

      if (pdfMetadataString) {
        const pdfMetadata = JSON.parse(pdfMetadataString) as PDFMetadata;
        const existingPdfsString = await SecureStore.getItemAsync(
          "all_pdf_files"
        );
        let existingPdfs: PDFMetadata[] = [];

        if (existingPdfsString) {
          existingPdfs = JSON.parse(existingPdfsString);
        }

        const pdfExists = existingPdfs.some(
          (pdf) => pdf.uri === pdfMetadata.uri
        );

        if (!pdfExists) {
          const updatedPdfs = [pdfMetadata, ...existingPdfs];

          await SecureStore.setItemAsync(
            "all_pdf_files",
            JSON.stringify(updatedPdfs)
          );
          setPdfFiles(updatedPdfs);
        } else {
          setPdfFiles(existingPdfs);
        }
      } else {
        const existingPdfsString = await SecureStore.getItemAsync(
          "all_pdf_files"
        );
        if (existingPdfsString) {
          setPdfFiles(JSON.parse(existingPdfsString));
        }
      }
    } catch (error) {
      console.error("Error loading PDF files:", error);
      Alert.alert("Error", "Failed to load PDF files");
    } finally {
      setIsLoading(false);
    }
  };

  const sharePdf = async (pdfUri: string) => {
    try {
      await Sharing.shareAsync(pdfUri);
    } catch (error) {
      console.error("Error sharing PDF:", error);
      Alert.alert("Sharing Error", "Could not share the PDF file.");
    }
  };

  const deletePdf = async (uri: string) => {
    Alert.alert("Delete PDF", "Are you sure you want to delete this PDF?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Remove from state
            const updatedPdfs = pdfFiles.filter((pdf) => pdf.uri !== uri);
            setPdfFiles(updatedPdfs);
            await SecureStore.setItemAsync(
              "all_pdf_files",
              JSON.stringify(updatedPdfs)
            );
          } catch (error) {
            console.error("Error deleting PDF:", error);
            Alert.alert("Error", "Failed to delete PDF");
          }
        },
      },
    ]);
  };

  const renderPdfItem = ({ item }: { item: PDFMetadata }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString();
    const formattedSize = (item.size / 1024).toFixed(1) + " KB";

    return (
      <View style={tw`p-4 mb-3 rounded-lg border border-white`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`p-3 bg-blue-100 rounded-lg mr-3`}>
            <Ionicons name="document-text" size={24} color="#3b82f6" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`font-bold ${colors.text}`} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={tw`flex-row justify-between mt-1`}>
              <Text style={tw`${colors.subtext} text-xs`}>{formattedDate}</Text>
              <Text style={tw`${colors.subtext} text-xs`}>{formattedSize}</Text>
            </View>
          </View>
        </View>
        <View
          style={tw`flex-row justify-end mt-3 pt-2 border-t ${colors.border}`}
        >
          <TouchableOpacity
            style={tw`mr-3 bg-red-500 bg-opacity-10 p-2 rounded-md`}
            onPress={() => deletePdf(item.uri)}
          >
            <Text style={tw`text-red-500 font-medium`}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`${colors.primary} p-2 rounded-md`}
            onPress={() => sharePdf(item.uri)}
          >
            <Text style={tw`text-white font-medium`}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const EmptyLibrary = () => (
    <View style={tw`flex-1 justify-center items-center p-6`}>
      <Ionicons
        name="folder-open-outline"
        size={64}
        color={isDarkMode ? "#6b7280" : "#9ca3af"}
      />
      <Text style={tw`text-xl font-bold mt-4 ${colors.text}`}>No PDFs Yet</Text>
      <Text style={tw`text-center mt-2 ${colors.subtext}`}>
        Your scanned documents will appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 ${colors.background}`}>
      <View style={tw` p-4`}>
        <Text style={tw`text-white text-xl font-bold`}>Library</Text>
      </View>

      {isLoading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={tw`${colors.text}`}>Loading documents...</Text>
        </View>
      ) : (
        <>
          {pdfFiles.length > 0 ? (
            <FlatList
              data={pdfFiles}
              keyExtractor={(item) => item.uri}
              renderItem={renderPdfItem}
              contentContainerStyle={tw`p-4`}
            />
          ) : (
            <EmptyLibrary />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
