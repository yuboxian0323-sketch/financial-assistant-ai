import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator, Modal as NativeModal, Pressable, ScrollView, StyleSheet, Text, TextInput,
  type TextInputProps, type ViewStyle, View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PropsWithChildren, ReactNode } from 'react';
import { theme } from '@/theme';
import { initials } from '@/utils/format';

type CardProps = PropsWithChildren<{ onPress?: () => void; disabled?: boolean; elevated?: boolean; padding?: keyof typeof theme.spacing; loading?: boolean; style?: ViewStyle }>;
export function Card({ children, onPress, disabled, elevated, padding = 'lg', loading, style }: CardProps) {
  const content = <View style={[styles.card, elevated && theme.elevation.card, { padding: theme.spacing[padding] }, style]}>{loading ? <LoadingSkeleton preset="card" /> : children}</View>;
  return onPress ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1 })}>{content}</Pressable> : content;
}

type ButtonProps = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'small' | 'medium'; loading?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap };
export function Button({ label, onPress, variant = 'primary', size = 'medium', loading, disabled, icon }: ButtonProps) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const duration = reduceMotion ? 0 : theme.motion.fast;
  return <Animated.View style={animated}><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading} onPress={onPress} onPressIn={() => { scale.value = withTiming(0.97, { duration }); }} onPressOut={() => { scale.value = withTiming(1, { duration }); }} style={[styles.button, styles[`button_${variant}`], size === 'small' && styles.buttonSmall, (disabled || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={theme.colors.text} /> : <>{icon && <Ionicons name={icon} size={18} color={variant === 'primary' ? theme.colors.background : theme.colors.text} />}<Text style={[styles.buttonText, variant === 'primary' && styles.buttonTextPrimary]}>{label}</Text></>}</Pressable></Animated.View>;
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <View style={styles.sectionHeader}><View style={styles.flex}><Text accessibilityRole="header" style={styles.heading}>{title}</Text>{subtitle && <Text style={styles.caption}>{subtitle}</Text>}</View>{action}</View>;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search companies', ...props }: TextInputProps & { value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.search}><Ionicons name="search" size={19} color={theme.colors.textSecondary} /><TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} returnKeyType="search" {...props} />{value.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={12} onPress={() => onChangeText('')}><Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} /></Pressable>}</View>;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return <View accessibilityLabel={`${name} avatar`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={styles.avatarText}>{initials(name)}</Text></View>;
}

export function StockRow({ ticker, name, price, change, onPress, trailing }: { ticker: string; name: string; price?: number; change?: number; onPress?: () => void; trailing?: ReactNode }) {
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${name}, ${ticker}`} onPress={onPress} style={({ pressed }) => [styles.stockRow, pressed && styles.pressed]}><Avatar name={name} /><View style={styles.flex}><Text style={styles.label}>{ticker}</Text><Text style={styles.caption}>{name}</Text></View>{trailing ?? <View style={styles.alignEnd}>{price !== undefined && <Text style={styles.label}>${price.toFixed(2)}</Text>}{change !== undefined && <Text style={[styles.caption, { color: change >= 0 ? theme.colors.positive : theme.colors.negative }]}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</Text>}</View>}</Pressable>;
}

export function WidgetContainer({ title, children, loading, empty, error, onRetry }: PropsWithChildren<{ title: string; loading?: boolean; empty?: boolean; error?: Error | null; onRetry?: () => void }>) {
  return <View style={styles.widget}><SectionHeader title={title} />{loading ? <LoadingSkeleton preset="card" /> : error ? <EmptyState title="Couldn’t load this section" description={error.message} actionLabel="Try again" onAction={onRetry} /> : empty ? <EmptyState title="Nothing here yet" description="This section is ready for your research." /> : children}</View>;
}

export function NewsCard({ headline, summary, timestamp, company, important }: { headline: string; summary: string; timestamp: string; company?: string; important?: boolean }) {
  return <Card><View style={styles.badges}>{company && <Tag label={company} />}{important && <Tag label="Important" tone="warning" />}</View><Text style={styles.label}>{headline}</Text><Text style={styles.body}>{summary}</Text><Text style={styles.caption}>{new Date(timestamp).toLocaleDateString()}</Text></Card>;
}

export function SummaryCard({ title, summary, metric, emphasis }: { title: string; summary: string; metric?: string; emphasis?: boolean }) {
  return <Card style={emphasis ? styles.emphasis : undefined}><Text style={styles.caption}>{title.toUpperCase()}</Text>{metric && <Text style={styles.metric}>{metric}</Text>}<Text style={styles.body}>{summary}</Text></Card>;
}

export function LoadingSkeleton({ preset = 'text', width }: { preset?: 'text' | 'card' | 'row'; width?: number | `${number}%` }) {
  const height = preset === 'card' ? 112 : preset === 'row' ? 56 : 16;
  return <Animated.View entering={FadeIn.duration(theme.motion.normal)} exiting={FadeOut} accessibilityLabel="Loading" style={[styles.skeleton, { height, width: width ?? '100%' }]} />;
}

export function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <View style={styles.empty}><Ionicons name="file-tray-outline" size={28} color={theme.colors.textMuted} /><Text style={styles.label}>{title}</Text><Text style={[styles.body, styles.center]}>{description}</Text>{actionLabel && onAction && <Button label={actionLabel} variant="secondary" size="small" onPress={onAction} />}</View>;
}

export function AppModal({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  return <NativeModal transparent animationType="fade" visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><SectionHeader title={title} action={<Pressable accessibilityLabel="Close modal" accessibilityRole="button" hitSlop={12} onPress={onClose}><Ionicons name="close" size={24} color={theme.colors.text} /></Pressable>} />{children}</View></View></NativeModal>;
}

export function BottomSheet({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const pan = Gesture.Pan().onUpdate((event) => { translateY.value = Math.max(0, event.translationY); }).onEnd(() => {
    if (translateY.value > 80) runOnJS(onClose)();
    else translateY.value = withTiming(0, { duration: reduceMotion ? 0 : theme.motion.normal });
  });
  return <NativeModal transparent animationType={reduceMotion ? 'none' : 'slide'} visible={visible} onRequestClose={onClose}><Pressable accessibilityLabel="Dismiss bottom sheet" style={styles.sheetBackdrop} onPress={onClose}><GestureDetector gesture={pan}><Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }, animatedStyle]}><Pressable onPress={(event) => event.stopPropagation()}><View style={styles.handle} /><SectionHeader title={title} action={<Pressable accessibilityLabel="Close bottom sheet" onPress={onClose}><Ionicons name="close" size={24} color={theme.colors.text} /></Pressable>} />{children}</Pressable></Animated.View></GestureDetector></Pressable></NativeModal>;
}

export function Tag({ label, tone = 'default' }: { label: string; tone?: 'default' | 'warning' | 'positive' }) {
  return <View style={[styles.tag, tone === 'warning' && styles.tagWarning, tone === 'positive' && styles.tagPositive]}><Text style={styles.tagText}>{label}</Text></View>;
}
export function Pill({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected }} onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}><Text style={styles.pillText}>{label}</Text></Pressable>;
}
export function Divider({ inset = 0, vertical }: { inset?: number; vertical?: boolean }) {
  return <View style={vertical ? [styles.dividerVertical, { marginVertical: inset }] : [styles.divider, { marginHorizontal: inset }]} />;
}
export function ProgressIndicator({ value, label }: { value?: number; label?: string }) {
  const normalizedValue = Math.max(0, Math.min(1, value ?? 0.42));
  const percentage = Math.round(normalizedValue * 100);
  return <View accessible accessibilityRole="progressbar" accessibilityValue={value === undefined ? undefined : { min: 0, max: 100, now: percentage }}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percentage}%` }]} /></View>{label && <Text style={styles.caption}>{label}</Text>}</View>;
}

export function Screen({ title, subtitle, children, scroll = true }: PropsWithChildren<{ title: string; subtitle?: string; scroll?: boolean }>) {
  const content = <View style={styles.screenContent}><Text accessibilityRole="header" style={styles.hero}>{title}</Text>{subtitle && <Text style={styles.body}>{subtitle}</Text>}{children}</View>;
  return scroll ? <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">{content}</ScrollView> : <View style={styles.screen}>{content}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  screenContent: { padding: theme.spacing.xl, gap: theme.spacing.lg, paddingBottom: theme.spacing.hero },
  flex: { flex: 1 }, alignEnd: { alignItems: 'flex-end' }, center: { textAlign: 'center' },
  hero: { ...theme.type.hero, color: theme.colors.text, marginTop: theme.spacing.md },
  heading: { ...theme.type.heading, color: theme.colors.text },
  label: { ...theme.type.heading, color: theme.colors.text },
  body: { ...theme.type.body, color: theme.colors.textSecondary },
  caption: { ...theme.type.caption, color: theme.colors.textMuted },
  metric: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: theme.colors.text },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, gap: theme.spacing.sm },
  emphasis: { backgroundColor: theme.colors.accentSoft },
  pressed: { opacity: theme.opacity.pressed }, disabled: { opacity: theme.opacity.disabled },
  button: { minHeight: 48, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  buttonSmall: { minHeight: 44, alignSelf: 'flex-start' },
  button_primary: { backgroundColor: theme.colors.accent }, button_secondary: { backgroundColor: theme.colors.surfaceElevated }, button_ghost: { backgroundColor: theme.colors.transparent },
  buttonText: { ...theme.type.heading, color: theme.colors.text }, buttonTextPrimary: { color: theme.colors.background },
  sectionHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  search: { minHeight: 48, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  searchInput: { flex: 1, ...theme.type.body, color: theme.colors.text, paddingVertical: theme.spacing.md },
  avatar: { backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { ...theme.type.caption, color: theme.colors.accent },
  stockRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  widget: { gap: theme.spacing.md }, badges: { flexDirection: 'row', gap: theme.spacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  skeleton: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.overlay },
  modalCard: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.lg },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surfaceElevated, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.md },
  handle: { width: 40, height: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, alignSelf: 'center' },
  tag: { alignSelf: 'flex-start', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  tagWarning: { backgroundColor: theme.colors.warning }, tagPositive: { backgroundColor: theme.colors.positive },
  tagText: { ...theme.type.caption, color: theme.colors.text },
  pill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  pillSelected: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }, pillText: { ...theme.type.caption, color: theme.colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }, dividerVertical: { width: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  progressTrack: { height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceElevated, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: theme.colors.accent },
});
