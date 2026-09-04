import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator, FlatList, Modal as NativeModal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  type TextInputProps, type TextProps, type ViewStyle, View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PropsWithChildren, ReactNode } from 'react';
import { theme } from '@/theme';
import type { CalendarEventItem } from '@/types/domain';
import { initials } from '@/utils/format';
import type { PriceChartMode } from './InteractivePriceChart';

export { InteractivePriceChart, type PriceChartMode } from './InteractivePriceChart';

type AppTextProps = TextProps & { variant?: keyof typeof theme.type; tone?: 'primary' | 'secondary' | 'muted' };
export function AppText({ variant = 'body', tone = 'primary', style, ...props }: AppTextProps) {
  const color = tone === 'primary' ? theme.colors.text : tone === 'secondary' ? theme.colors.textSecondary : theme.colors.textMuted;
  return <Text {...props} style={[theme.type[variant], { color }, style]} />;
}

type CardProps = PropsWithChildren<{ onPress?: () => void; disabled?: boolean; elevated?: boolean; padding?: keyof typeof theme.spacing; loading?: boolean; style?: ViewStyle }>;
export function Card({ children, onPress, disabled, elevated, padding = 'lg', loading, style }: CardProps) {
  const content = <View style={[styles.card, elevated && theme.elevation.card, { padding: theme.spacing[padding] }, style]}>{loading ? <LoadingSkeleton preset="card" /> : children}</View>;
  return onPress ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1 })}>{content}</Pressable> : content;
}

type ButtonProps = { label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'small' | 'medium'; loading?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap };
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

export function ActionLink({ label, onPress, prominent }: { label: string; onPress: () => void; prominent?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}><AppText variant={prominent ? 'heading' : 'caption'} style={styles.actionLinkText}>{label}</AppText><Ionicons name="chevron-forward" size={prominent ? 17 : 16} color={theme.colors.accent} /></Pressable>;
}

export function BulletList({ items }: { items: string[] }) {
  return <View style={styles.bulletList}>{items.map((item, index) => <View key={`${index}-${item}`} style={styles.bulletRow}><View style={styles.bullet} /><AppText tone="secondary" style={styles.flex}>{item}</AppText></View>)}</View>;
}

export function MetadataRow({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return <View style={styles.metadataRow}><AppText variant="caption" tone="muted">{label}</AppText><AppText variant={compact ? 'caption' : 'body'} style={styles.flex}>{value}</AppText></View>;
}

export function ChartModeToggle({ value, onChange }: { value: PriceChartMode; onChange: (mode: PriceChartMode) => void }) {
  return <View accessibilityRole="tablist" style={styles.chartModeToggle}>{(['line', 'bar'] as const).map((mode) => {
    const selected = value === mode;
    return <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(mode)} style={({ pressed }) => [styles.chartModeButton, selected && styles.chartModeSelected, pressed && styles.pressed]}><Ionicons name={mode === 'line' ? 'analytics-outline' : 'bar-chart-outline'} size={18} color={selected ? theme.colors.accent : theme.colors.textSecondary} /><AppText variant="caption" style={selected ? styles.actionLinkText : undefined}>{mode === 'line' ? 'Line' : 'Bars'}</AppText></Pressable>;
  })}</View>;
}

export function CalendarEvents({ items, subtitle, onViewAll }: { items: CalendarEventItem[]; subtitle: string; onViewAll: () => void }) {
  return <View style={styles.collectionSection}><SectionHeader title="Upcoming Events" subtitle={subtitle} action={<ActionLink label="View calendar" onPress={onViewAll} />} /><FlatList data={items} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id} contentContainerStyle={styles.horizontalList} renderItem={({ item }) => {
    const date = new Date(item.date);
    return <View style={styles.eventCard}><View style={styles.dateBadge}><AppText variant="caption" tone="secondary">{date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</AppText><AppText variant="title">{date.getDate()}</AppText></View><AppText variant="heading">{item.title}</AppText><AppText variant="caption" tone="muted">{item.relativeLabel}</AppText></View>;
  }} /></View>;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search companies', ...props }: TextInputProps & { value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.search}><Ionicons name="search" size={19} color={theme.colors.textSecondary} /><TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} returnKeyType="search" {...props} />{value.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={12} onPress={() => onChangeText('')}><Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} /></Pressable>}</View>;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return <View accessibilityLabel={`${name} avatar`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={styles.avatarText}>{initials(name)}</Text></View>;
}

const companyLogoIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  nvda: 'hardware-chip', msft: 'logo-microsoft', aapl: 'logo-apple', googl: 'logo-google',
  meta: 'infinite', amd: 'hardware-chip-outline', tsm: 'hardware-chip',
};

export function CompanyLogo({ companyId, name, size = 44 }: { companyId: string; name: string; size?: number }) {
  return <View accessibilityLabel={`${name} logo`} style={[styles.companyLogo, { width: size, height: size, borderRadius: size / 2 }]}><Ionicons name={companyLogoIcons[companyId] ?? 'business'} size={size * 0.5} color={theme.colors.accent} /></View>;
}

export function MiniSparkline({ points, width, height = 44, positive = true }: { points: number[]; width: number; height?: number; positive?: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const step = width / Math.max(1, points.length - 1);
  const coordinates = points.map((point, index) => ({ x: index * step, y: height - ((point - min) / range) * (height - theme.spacing.sm) - theme.spacing.xs }));
  return <View accessible={false} pointerEvents="none" style={{ position: 'relative', width, height }}>{coordinates.slice(0, -1).map((point, index) => {
    const next = coordinates[index + 1];
    if (!next) return null;
    const lineWidth = Math.hypot(next.x - point.x, next.y - point.y);
    const angle = Math.atan2(next.y - point.y, next.x - point.x) * (180 / Math.PI);
    return <View key={`${point.x}-${point.y}`} style={[styles.sparklineSegment, { backgroundColor: positive ? theme.colors.positive : theme.colors.negative, width: lineWidth, left: (point.x + next.x) / 2 - lineWidth / 2, top: (point.y + next.y) / 2, transform: [{ rotate: `${angle}deg` }] }]} />;
  })}</View>;
}

export function StockRow({ ticker, name, price, change, quoteSource, onPress, trailing }: { ticker: string; name: string; price?: number; change?: number; quoteSource?: 'live' | 'sample'; onPress?: () => void; trailing?: ReactNode }) {
  const sourceLabel = quoteSource === 'live' ? 'Finnhub quote' : quoteSource === 'sample' ? 'Sample fallback' : undefined;
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${name}, ${ticker}${sourceLabel ? `, ${sourceLabel}` : ''}`} onPress={onPress} style={({ pressed }) => [styles.stockRow, pressed && styles.pressed]}><Avatar name={name} /><View style={styles.flex}><Text style={styles.label}>{ticker}</Text><Text style={styles.caption}>{name}</Text></View>{trailing ?? <View style={styles.alignEnd}>{price !== undefined && <Text style={styles.label}>${price.toFixed(2)}</Text>}{change !== undefined && <Text style={[styles.caption, { color: change >= 0 ? theme.colors.positive : theme.colors.negative }]}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</Text>}{sourceLabel && <Text style={styles.quoteSource}>{sourceLabel}</Text>}</View>}</Pressable>;
}

export function WidgetContainer({ title, children, loading, empty, error, onRetry }: PropsWithChildren<{ title: string; loading?: boolean; empty?: boolean; error?: Error | null; onRetry?: () => void }>) {
  return <View style={styles.widget}><SectionHeader title={title} />{loading ? <LoadingSkeleton preset="card" /> : error ? <EmptyState title="Couldn’t load this section" description={error.message} actionLabel="Try again" onAction={onRetry} /> : empty ? <EmptyState title="Nothing here yet" description="This section is ready for your research." /> : children}</View>;
}

export function NewsCard({ headline, summary, timestamp, company, source, important, onPress }: { headline: string; summary: string; timestamp: string; company?: string; source?: string; important?: boolean; onPress?: () => void }) {
  const date = new Date(timestamp);
  const dateLabel = Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
  return <Card onPress={onPress}><View style={styles.badges}>{company && <Tag label={company} />}{important && <Tag label="Important" tone="warning" />}</View><Text style={styles.label}>{headline}</Text>{summary ? <Text style={styles.body}>{summary}</Text> : null}<Text style={styles.caption}>{source ? `${source} · ` : ''}{dateLabel}{onPress ? ' · Open article' : ''}</Text></Card>;
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

export function ConfirmModal({ visible, title, description, confirmLabel, cancelLabel = 'Cancel', loading, onConfirm, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; description: string; confirmLabel: string; cancelLabel?: string; loading?: boolean; onConfirm: () => void; onClose: () => void }>) {
  return <AppModal visible={visible} title={title} onClose={onClose}><AppText tone="secondary">{description}</AppText>{children}<View style={styles.modalActions}><Button label={cancelLabel} variant="ghost" disabled={loading} onPress={onClose} /><Button label={confirmLabel} loading={loading} onPress={onConfirm} /></View></AppModal>;
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

export function Screen({ title, subtitle, children, scroll = true, refreshing = false, onRefresh }: PropsWithChildren<{ title: string; subtitle?: string; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void }>) {
  const router = useRouter();
  const pathname = usePathname();
  const content = <View style={styles.screenContent}><View style={styles.screenHeader}><Text accessibilityRole="header" style={[styles.hero, styles.screenTitle]}>{title}</Text>{pathname !== '/settings' && <Pressable accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={8} onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}><Ionicons name="settings-outline" size={22} color={theme.colors.text} /></Pressable>}</View>{subtitle && <Text style={styles.body}>{subtitle}</Text>}{children}</View>;
  return scroll ? <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} /> : undefined}>{content}</ScrollView> : <View style={styles.screen}>{content}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  screenContent: { padding: theme.spacing.xl, gap: theme.spacing.lg, paddingBottom: theme.spacing.hero },
  flex: { flex: 1 }, alignEnd: { alignItems: 'flex-end' }, center: { textAlign: 'center' },
  screenHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.md },
  screenTitle: { flex: 1 },
  settingsButton: { width: 44, height: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  hero: { ...theme.type.hero, color: theme.colors.text },
  heading: { ...theme.type.heading, color: theme.colors.text },
  label: { ...theme.type.heading, color: theme.colors.text },
  body: { ...theme.type.body, color: theme.colors.textSecondary },
  caption: { ...theme.type.caption, color: theme.colors.textMuted },
  quoteSource: { ...theme.type.caption, color: theme.colors.textMuted, fontSize: 10, lineHeight: 13 },
  metric: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: theme.colors.text },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, gap: theme.spacing.sm },
  emphasis: { backgroundColor: theme.colors.accentSoft },
  pressed: { opacity: theme.opacity.pressed }, disabled: { opacity: theme.opacity.disabled },
  button: { minHeight: 48, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  buttonSmall: { minHeight: 44, alignSelf: 'flex-start' },
  button_primary: { backgroundColor: theme.colors.accent }, button_secondary: { backgroundColor: theme.colors.surfaceElevated }, button_ghost: { backgroundColor: theme.colors.transparent },
  buttonText: { ...theme.type.heading, color: theme.colors.text }, buttonTextPrimary: { color: theme.colors.background },
  sectionHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  actionLink: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  actionLinkText: { color: theme.colors.accent, fontWeight: '700' },
  bulletList: { gap: theme.spacing.md },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  bullet: { width: 7, height: 7, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, marginTop: theme.spacing.sm },
  metadataRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  chartModeToggle: { alignSelf: 'flex-end', flexDirection: 'row', gap: theme.spacing.sm },
  chartModeButton: { minWidth: 88, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  chartModeSelected: { backgroundColor: theme.colors.accentSoft },
  collectionSection: { gap: theme.spacing.md },
  horizontalList: { gap: theme.spacing.md },
  eventCard: { width: 154, minHeight: 166, gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  dateBadge: { width: 58, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.accent },
  search: { minHeight: 48, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  searchInput: { flex: 1, ...theme.type.body, color: theme.colors.text, paddingVertical: theme.spacing.md },
  avatar: { backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { ...theme.type.caption, color: theme.colors.accent },
  companyLogo: { backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  sparklineSegment: { position: 'absolute', height: 2, borderRadius: theme.radius.pill },
  stockRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  widget: { gap: theme.spacing.md }, badges: { flexDirection: 'row', gap: theme.spacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  skeleton: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.overlay },
  modalCard: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: theme.spacing.sm },
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
