/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import {
  Alert,
  TouchableOpacity,
  ScrollView,
  View,
  ActivityIndicator,
} from "react-native";
import * as Updates from "expo-updates";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";
import tw from "tailwind-react-native-classnames";

const Page = () => {
  const [isLoading, setIsLoading] = useState(false);

  const checkForUpdates = async () => {
    try {
      setIsLoading(true);
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          "Update Available",
          "A new version of the app has been downloaded.",
          [
            {
              text: "Later",
              style: "cancel",
            },
            {
              text: "Restart Now",
              onPress: () => Updates.reloadAsync(),
              style: "default",
            },
          ]
        );
      } else {
        Alert.alert(
          "Up to Date",
          "You're running the latest version of the app."
        );
      }
    } catch (e) {
      Alert.alert(
        "Update Error",
        "Could not check for updates. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <ScrollView>
        <View style={tw`px-5 pt-5 pb-3`}>
          <Text style={tw`text-3xl font-bold text-gray-800`}>Settings</Text>
        </View>

        <View
          style={tw`bg-white rounded-lg shadow-md mx-4 my-2 overflow-hidden`}
        >
          <View
            style={tw`flex-row justify-between items-center p-4 border-b border-gray-200`}
          >
            <Text style={tw`text-lg font-semibold text-gray-800`}>
              App Updates
            </Text>
          </View>

          {isLoading ? (
            <View style={tw`p-5 items-center`}>
              <ActivityIndicator size="large" color="#FFA500" />
            </View>
          ) : (
            <TouchableOpacity style={tw`p-4`} onPress={checkForUpdates}>
              <View
                style={[
                  tw`py-3 px-4 rounded-lg flex-row justify-center items-center`,
                  { backgroundColor: "#FFA500" },
                ]}
              >
                <Text style={tw`text-white text-base font-semibold mr-2`}>
                  Check for Updates
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Page;
