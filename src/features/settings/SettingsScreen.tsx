import { useState } from 'react';
import { Text } from 'react-native';
import { AppModal, BottomSheet, Button, Card, Divider, ProgressIndicator, Screen, SectionHeader, SummaryCard, Tag } from '@/components';
import { useDatabaseInfo } from '@/hooks/useAppQueries';
import { theme } from '@/theme';

export function SettingsScreen() {
  const [appearance, setAppearance] = useState(false);
  const [developer, setDeveloper] = useState(false);
  const info = useDatabaseInfo();
  return <Screen title="Settings" subtitle="Foundation preferences and local system information.">
    <SectionHeader title="Appearance" subtitle="Dark mode is active in Phase 1." />
    <Card onPress={() => setAppearance(true)}><Text style={{ ...theme.type.heading, color: theme.colors.text }}>Dark appearance</Text><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>A light palette contract exists for future work.</Text></Card>
    <SectionHeader title="Database Info" />
    <SummaryCard title="Local SQLite" metric={info.data ? `v${info.data.version}` : '…'} summary={info.data ? `Seed v${info.data.seedVersion} · ${info.data.companyCount} companies` : 'Reading local database information…'} />
    <Divider />
    <SectionHeader title="Developer Info" />
    <Button label="View foundation details" variant="secondary" icon="code-slash-outline" onPress={() => setDeveloper(true)} />
    <Card><Tag label="Expo SDK 54" /><ProgressIndicator value={1} label="Foundation sample completion" /></Card>
    <AppModal visible={appearance} title="Appearance" onClose={() => setAppearance(false)}><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>Dark mode is intentionally fixed for v0.1. No functional theme toggle is included.</Text><Button label="Done" onPress={() => setAppearance(false)} /></AppModal>
    <BottomSheet visible={developer} title="Developer Info" onClose={() => setDeveloper(false)}><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>Local-first · No network requests · No AI model · No brokerage integration</Text><Button label="Close" variant="ghost" onPress={() => setDeveloper(false)} /></BottomSheet>
  </Screen>;
}
