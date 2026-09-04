import { Tabs } from 'expo-router';
import { InvestmentTabBar } from '@/components/navigation/InvestmentTabBar';

export default function TabLayout() {
  return <Tabs tabBar={(props) => <InvestmentTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
    <Tabs.Screen name="workspace" options={{ title: 'Workspace' }} />
    <Tabs.Screen name="research" options={{ title: 'Research' }} />
    <Tabs.Screen name="automations" options={{ title: 'Tasks' }} />
  </Tabs>;
}
