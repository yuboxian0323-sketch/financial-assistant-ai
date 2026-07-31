import { Text, View } from 'react-native';
import { Button, Card, Pill, Screen, SectionHeader, Tag } from '@/components';
import { theme } from '@/theme';

const categories = [
  { title: 'Price Alerts', icon: 'Price', description: 'Watch thresholds and meaningful price moves.' },
  { title: 'Market Alerts', icon: 'Market', description: 'Follow market sessions, policy decisions, volatility, and index moves.' },
  { title: 'Earnings', icon: 'Earnings', description: 'Prepare, summarize, and compare reported results.' },
  { title: 'News Monitoring', icon: 'News', description: 'Follow companies, industries, and thesis changes.' },
  { title: 'Scheduled Reports', icon: 'Reports', description: 'Generate recurring portfolio and research briefs.' },
  { title: 'Scheduled Graphs', icon: 'Graphs', description: 'Prepare recurring chart and comparison placeholders.' },
  { title: 'AI Monitoring', icon: 'AI', description: 'Persistent agents for long-running research questions.' },
  { title: 'Portfolio Monitoring', icon: 'Risk', description: 'Track concentration, allocation, cash, and risk.' },
] as const;

const templates = ['Morning Brief', 'Weekly Research', 'AI Industry Watch', 'Valuation Tracker'];

export function AutomationsScreen() {
  return <Screen title="Automations" subtitle="Describe recurring investment work. These controls are placeholders—no AI jobs or notifications run in v0.2.">
    <Card elevated><Tag label="Natural language builder" /><Text style={{ ...theme.type.heading, color: theme.colors.text }}>What should the system watch?</Text><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>“Compare AMD and NVIDIA every Friday.”</Text><Button label="Build automation soon" disabled onPress={() => undefined} /></Card>
    <SectionHeader title="Automation Center" subtitle="Future AI work, organized by responsibility" />
    <View style={{ gap: theme.spacing.md }}>{categories.map((category) => <Card key={category.title}><View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}><Tag label={category.icon} /><View style={{ flex: 1 }}><Text style={{ ...theme.type.heading, color: theme.colors.text }}>{category.title}</Text><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>{category.description}</Text></View></View></Card>)}</View>
    <SectionHeader title="Starter Templates" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>{templates.map((template) => <Pill key={template} label={template} />)}</View>
  </Screen>;
}
