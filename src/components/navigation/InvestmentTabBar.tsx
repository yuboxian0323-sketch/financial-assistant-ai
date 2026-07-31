import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  portfolio: 'briefcase-outline',
  workspace: 'grid-outline',
  research: 'search-outline',
  automations: 'flash-outline',
  settings: 'settings-outline',
};

const tabPositions: Record<string, `${number}%`> = {
  index: '7%',
  portfolio: '23%',
  workspace: '50%',
  research: '65%',
  automations: '79%',
  settings: '92%',
};

export function InvestmentTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.container, { height: 82 + insets.bottom, paddingBottom: insets.bottom }]}>
    <View style={styles.capsule} />
    {state.routes.map((route, index) => {
      const focused = state.index === index;
      const options = descriptors[route.key]?.options;
      const label = typeof options?.tabBarLabel === 'string' ? options.tabBarLabel : options?.title ?? route.name;
      const isWorkspace = route.name === 'workspace';
      const color = focused ? theme.colors.accent : theme.colors.textMuted;
      const onPress = () => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
      };
      const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
      return <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityLabel={`${label} tab`}
        accessibilityState={{ selected: focused }}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.item, { left: tabPositions[route.name] ?? '50%' }, isWorkspace && styles.workspaceItem]}
      >
        <View style={isWorkspace ? [styles.workspaceButton, focused && styles.workspaceButtonFocused] : styles.iconSlot}>
          <Ionicons name={tabIcons[route.name] ?? 'ellipse-outline'} size={isWorkspace ? 28 : 21} color={isWorkspace ? theme.colors.background : color} />
        </View>
        <Text numberOfLines={1} style={[styles.label, { color }, isWorkspace && styles.workspaceLabel]}>{label}</Text>
        {focused && !isWorkspace && <View style={styles.activeDot} />}
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.background, position: 'relative' },
  capsule: { position: 'absolute', left: theme.spacing.md, right: theme.spacing.md, top: theme.spacing.md, height: 58, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, ...theme.elevation.card },
  item: { position: 'absolute', top: theme.spacing.md, width: 64, minHeight: 58, marginLeft: -32, alignItems: 'center', justifyContent: 'center' },
  workspaceItem: { top: -theme.spacing.sm, width: 82, marginLeft: -41 },
  iconSlot: { width: 44, height: 34, alignItems: 'center', justifyContent: 'center' },
  workspaceButton: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, borderWidth: 5, borderColor: theme.colors.background, ...theme.elevation.card },
  workspaceButtonFocused: { backgroundColor: theme.colors.positive },
  label: { ...theme.type.caption, fontSize: 9, lineHeight: 12 },
  workspaceLabel: { marginTop: theme.spacing.xs, fontWeight: '700' },
  activeDot: { width: 4, height: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, marginTop: 2 },
});
