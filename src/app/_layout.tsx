import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Suspense, type PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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

function ReliableBackButton({ fallback }: { fallback: '/research' | '/workspace' | '/automations' | '/' }) {
  const router = useRouter();
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel="Go back"
    hitSlop={8}
    onPress={() => { if (router.canGoBack()) router.back(); else router.replace(fallback); }}
    style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
  ><Ionicons name="chevron-back" size={26} color={theme.colors.text} /></Pressable>;
}

export default function RootLayout() {
  return <Root><Stack screenOptions={{ headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: theme.colors.background }, animation: 'fade_from_bottom' }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="company/[id]" options={{ title: 'Company Knowledge Base', headerLeft: () => <ReliableBackButton fallback="/research" /> }} /><Stack.Screen name="stock/[symbol]" options={{ title: 'Stock Quote', headerLeft: () => <ReliableBackButton fallback="/research" /> }} /><Stack.Screen name="news/[id]" options={{ title: 'News', headerLeft: () => <ReliableBackButton fallback="/research" /> }} /><Stack.Screen name="widget-gallery" options={{ title: 'Widget Gallery', presentation: 'fullScreenModal', headerLeft: () => <ReliableBackButton fallback="/workspace" /> }} /><Stack.Screen name="ai-support" options={{ title: 'AI Support', headerLeft: () => <ReliableBackButton fallback="/workspace" /> }} /><Stack.Screen name="research-task/new" options={{ title: 'New Research Task', headerLeft: () => <ReliableBackButton fallback="/automations" /> }} /><Stack.Screen name="research-task/[id]" options={{ title: 'Research Task', headerLeft: () => <ReliableBackButton fallback="/automations" /> }} /><Stack.Screen name="settings" options={{ title: 'Settings', headerLeft: () => <ReliableBackButton fallback="/" /> }} /></Stack></Root>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.lg },
  logo: { width: 64, height: 64, borderRadius: theme.radius.lg, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.type.title, color: theme.colors.text, textAlign: 'center' },
  body: { ...theme.type.body, color: theme.colors.textSecondary, textAlign: 'center' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: theme.opacity.pressed },
});
