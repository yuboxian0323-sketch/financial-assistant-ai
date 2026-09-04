import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  portfolio: 'briefcase-outline',
  workspace: 'grid-outline',
  research: 'search-outline',
  automations: 'people-outline',
};

const tabPositions: Record<string, `${number}%`> = {
  index: '12%',
  portfolio: '30%',
  workspace: '50%',
  research: '70%',
  automations: '88%',
};

export function InvestmentTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes;

  return (
    <View style={[styles.container, { height: 90 + insets.bottom, paddingBottom: insets.bottom }]}>
      <View pointerEvents="none" style={styles.capsule} />
      {visibleRoutes.map((route) => {
        const routeIndex = state.routes.findIndex((item) => item.key === route.key);
        const focused = state.index === routeIndex;
        const options = descriptors[route.key]?.options;
        const label =
          typeof options?.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options?.title ?? route.name;
        const isWorkspace = route.name === 'workspace';
        const color = focused ? theme.colors.accent : theme.colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.dispatch({
              ...TabActions.jumpTo(route.name, route.params),
              target: state.key,
            });
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={`${label} tab`}
            accessibilityState={{ selected: focused }}
            hitSlop={4}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            testID={`tab-${route.name}`}
            style={({ pressed }) => [
              styles.item,
              { left: tabPositions[route.name] ?? '50%' },
              isWorkspace && styles.workspaceItem,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={
                isWorkspace
                  ? [styles.workspaceButton, focused && styles.workspaceButtonFocused]
                  : styles.iconSlot
              }
            >
              <Ionicons
                name={tabIcons[route.name] ?? 'ellipse-outline'}
                size={isWorkspace ? 28 : 21}
                color={isWorkspace ? theme.colors.background : color}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, { color }, isWorkspace && styles.workspaceLabel]}
            >
              {label}
            </Text>
            {focused && !isWorkspace ? <View style={styles.activeDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.background, position: 'relative' },
  capsule: {
    position: 'absolute',
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    top: theme.spacing.md,
    height: 66,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.elevation.card,
  },
  item: {
    position: 'absolute',
    zIndex: 1,
    top: theme.spacing.md,
    width: 64,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: theme.spacing.xs,
    transform: [{ translateX: '-50%' }],
  },
  pressed: { opacity: theme.opacity.pressed },
  workspaceItem: {
    zIndex: 2,
    top: -theme.spacing.sm,
    width: 64,
    minHeight: 90,
  },
  iconSlot: { width: 44, height: 34, alignItems: 'center', justifyContent: 'center' },
  workspaceButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderWidth: 5,
    borderColor: theme.colors.background,
    ...theme.elevation.card,
  },
  workspaceButtonFocused: { backgroundColor: theme.colors.positive },
  label: { ...theme.type.caption, fontSize: 10, lineHeight: 13 },
  workspaceLabel: { marginTop: theme.spacing.xs, fontWeight: '700' },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    marginTop: 1,
  },
});
