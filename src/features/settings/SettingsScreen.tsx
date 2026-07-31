import { useState } from 'react';
import { AppModal, AppText, BottomSheet, Button, Card, Divider, ProgressIndicator, Screen, SectionHeader, SummaryCard, Tag } from '@/components';
import { useDatabaseInfo } from '@/hooks/useAppQueries';

export function SettingsScreen() {
  const [appearance, setAppearance] = useState(false);
  const [developer, setDeveloper] = useState(false);
  const info = useDatabaseInfo();
  return <Screen title="Settings" subtitle="Foundation preferences and local system information.">
    <SectionHeader title="Appearance" subtitle="Dark mode is active in Phase 1." />
    <Card onPress={() => setAppearance(true)}><AppText variant="heading">Dark appearance</AppText><AppText tone="secondary">A light palette contract exists for future work.</AppText></Card>
    <SectionHeader title="Database Info" />
    <SummaryCard title="Local SQLite" metric={info.data ? `v${info.data.version}` : '…'} summary={info.data ? `Seed v${info.data.seedVersion} · ${info.data.companyCount} companies` : 'Reading local database information…'} />
    <Divider />
    <SectionHeader title="Developer Info" />
    <Button label="View foundation details" variant="secondary" icon="code-slash-outline" onPress={() => setDeveloper(true)} />
    <Card><Tag label="Expo SDK 54" /><ProgressIndicator value={1} label="Foundation sample completion" /></Card>
    <AppModal visible={appearance} title="Appearance" onClose={() => setAppearance(false)}><AppText tone="secondary">Dark mode is intentionally fixed for v0.1. No functional theme toggle is included.</AppText><Button label="Done" onPress={() => setAppearance(false)} /></AppModal>
    <BottomSheet visible={developer} title="Developer Info" onClose={() => setDeveloper(false)}><AppText tone="secondary">Local-first · No network requests · No AI model · No brokerage integration</AppText><Button label="Close" variant="ghost" onPress={() => setDeveloper(false)} /></BottomSheet>
  </Screen>;
}
