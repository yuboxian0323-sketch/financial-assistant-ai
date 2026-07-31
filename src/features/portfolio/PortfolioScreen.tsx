import { Card, EmptyState, Screen, StockRow, Tag, WidgetContainer } from '@/components';
import { usePortfolio } from '@/hooks/useAppQueries';
import { formatCurrency } from '@/utils/format';
import { Text, View } from 'react-native';
import { theme } from '@/theme';

export function PortfolioScreen() {
  const portfolio = usePortfolio();
  return <Screen title="Portfolio" subtitle="Manual holdings. Sample data only—no brokerage connection.">
    <WidgetContainer title="Holdings" loading={portfolio.isLoading} error={portfolio.error} onRetry={() => portfolio.refetch()} empty={!portfolio.isLoading && portfolio.data?.length === 0}>
      {portfolio.data?.map((holding) => <Card key={holding.id}>
        <StockRow ticker={holding.company.ticker} name={holding.company.name} price={holding.company.price} change={holding.company.dailyChange} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}><Tag label={`${holding.shares} shares`} /><Tag label={`Avg ${formatCurrency(holding.averageCost)}`} /></View>
        <Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>{holding.notes}</Text>
      </Card>)}
      {!portfolio.isLoading && !portfolio.data?.length && <EmptyState title="No holdings yet" description="Manual holdings will appear here." />}
    </WidgetContainer>
  </Screen>;
}
