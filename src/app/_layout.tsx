import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Suspense, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from '@/providers/AppProviders';
import { Button } from '@/components';
import { theme } from '@/theme';

function Startup() {
  return <View accessibilityLabel="Preparing local investment knowledge base" style={styles.center}><View style={styles.logo}><Ionicons name="layers" size={30} color={theme.colors.accent} /></View><Text style={styles.title}>AI Investment OS</Text><Text style={styles.body}>Preparing your local knowledge base…</Text><ActivityIndicator color={theme.colors.accent} /></View>;
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <SafeAreaProvider><View style={styles.center}><Ionicons name="warning-outline" size={34} color={theme.colors.warning} /><Text style={styles.title}>Local database unavailable</Text><Text style={styles.body}>{error.message}</Text><Button label="Try again" onPress={retry} /></View></SafeAreaProvider>;
}

function Root({ children }: PropsWithChildren) {
  return <GestureHandlerRootView style={styles.flex}><SafeAreaProvider><Suspense fallback={<Startup />}><AppProviders>{children}</AppProviders></Suspense></SafeAreaProvider></GestureHandlerRootView>;
}

export default function RootLayout() {
  return <Root><Stack screenOptions={{ headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: theme.colors.background }, animation: 'fade_from_bottom' }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="company/[id]" options={{ title: 'Company Knowledge Base', headerBackTitle: 'Research' }} /></Stack></Root>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.lg },
  logo: { width: 64, height: 64, borderRadius: theme.radius.lg, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.type.title, color: theme.colors.text, textAlign: 'center' },
  body: { ...theme.type.body, color: theme.colors.textSecondary, textAlign: 'center' },
});
