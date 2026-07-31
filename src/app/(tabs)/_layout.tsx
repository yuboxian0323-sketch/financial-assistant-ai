import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { theme } from '@/theme';

const icons = { index: 'sparkles-outline', portfolio: 'briefcase-outline', research: 'search-outline', watchlist: 'bookmark-outline', settings: 'settings-outline' } as const;

export default function TabLayout() {
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: theme.colors.accent,
    tabBarInactiveTintColor: theme.colors.textMuted,
    tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
    tabBarLabelStyle: theme.type.caption,
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name as keyof typeof icons] ?? 'ellipse-outline'} size={size} color={color} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
    <Tabs.Screen name="research" options={{ title: 'Research' }} />
    <Tabs.Screen name="watchlist" options={{ title: 'Watchlist' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
