import React from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { colours } from './theme';

const STORE = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
const HELP = 'https://support.google.com/android/answer/12201227';
const STEPS_HELP = 'https://support.google.com/android/answer/16786157';
export default function HealthConnectGuide() {
  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Could not open link', 'Open Google Play or Android Settings manually.'));
  return <View style={{ padding: 18, gap: 10, borderRadius: 18, backgroundColor: colours.blueSoft }}>
    <Text style={{ fontWeight: '800', color: colours.ink }}>Set up free phone-only steps</Text>
    <Text>Health Connect is Google’s free Android health-data component. No smartwatch or payment in PoshanTrack is required. Other fitness apps may offer paid extras.</Text>
    <Text>1. Android 14+: find Health Connect in Settings (search “Health Connect”). On Android 9–13, install it from Google Play. Android 8 can use the diary, but Health Connect step syncing is unavailable.</Text>
    <Text>2. On supported Android 14+ phones with updated system components, Health Connect can count steps directly from the phone after an app has READ Steps permission. Keep your phone with you. If built-in tracking is unavailable, use a compatible phone fitness app and allow it to WRITE steps into Health Connect.</Text>
    <Text>3. Tap Sync Health Connect in PoshanTrack and allow READ Steps only. After permission is granted, PoshanTrack refreshes when opened and about once a minute while active. Health Connect or your fitness app handles background counting; PoshanTrack reads today’s aggregate total rather than running its own pedometer.</Text>
    <Text>4. If the total is zero, check READ Steps is allowed, look for step entries in Health Connect and verify built-in tracking is enabled (if available). Otherwise check your fitness app’s recorded steps and WRITE permission. New steps can take a minute or more to appear. Permissions can be revoked at any time.</Text>
    <Pressable accessibilityRole="link" onPress={() => open(STORE)}><Text style={{ color: colours.blue, fontWeight: '700' }}>Get Health Connect from Google Play ↗</Text></Pressable>
    <Pressable accessibilityRole="link" onPress={() => open(HELP)}><Text style={{ color: colours.blue }}>Official setup and privacy help ↗</Text></Pressable>
    <Pressable accessibilityRole="link" onPress={() => open(STEPS_HELP)}><Text style={{ color: colours.blue }}>Built-in phone step tracking help ↗</Text></Pressable>
  </View>;
}
