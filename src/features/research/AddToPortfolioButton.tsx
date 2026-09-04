import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { AppModal, AppText, Button, Card } from '@/components';
import { useAddPortfolioHolding, usePortfolio, useRemovePortfolioHolding } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import { normalizeStockSymbol } from '@/utils/stocks';

type PortfolioStock = {
  symbol: string;
  name: string;
  type: string;
  price: number;
};

export function AddToPortfolioButton({ stock }: { stock: PortfolioStock }) {
  const holdings = usePortfolio();
  const addHolding = useAddPortfolioHolding();
  const removeHolding = useRemovePortfolioHolding();
  const [visible, setVisible] = useState(false);
  const [removeVisible, setRemoveVisible] = useState(false);
  const [shares, setShares] = useState('1');
  const [averageCost, setAverageCost] = useState(stock.price.toFixed(2));
  const normalizedSymbol = normalizeStockSymbol(stock.symbol);
  const existingHolding = holdings.data?.find((holding) => holding.company.ticker.toUpperCase() === normalizedSymbol);
  const alreadyAdded = Boolean(existingHolding);
  const parsedShares = Number(shares);
  const parsedAverageCost = Number(averageCost);
  const valid = Number.isFinite(parsedShares) && parsedShares > 0 && Number.isFinite(parsedAverageCost) && parsedAverageCost > 0;
  const total = useMemo(() => valid ? parsedShares * parsedAverageCost : 0, [parsedAverageCost, parsedShares, valid]);

  function open() {
    setShares('1');
    setAverageCost(stock.price.toFixed(2));
    addHolding.reset();
    setVisible(true);
  }

  function save() {
    if (!valid) return;
    addHolding.mutate({
      symbol: normalizedSymbol,
      name: stock.name,
      type: stock.type,
      shares: parsedShares,
      averageCost: parsedAverageCost,
    }, { onSuccess: () => setVisible(false) });
  }

  function remove() {
    if (!existingHolding) return;
    removeHolding.mutate(existingHolding.companyId, { onSuccess: () => setRemoveVisible(false) });
  }

  return <>
    <Button
      label={alreadyAdded ? 'Remove from portfolio' : 'Add to portfolio'}
      icon={alreadyAdded ? 'trash-outline' : 'add-circle-outline'}
      variant={alreadyAdded ? 'secondary' : 'primary'}
      disabled={holdings.isLoading}
      onPress={alreadyAdded ? () => { removeHolding.reset(); setRemoveVisible(true); } : open}
    />
    <AppModal visible={visible} title={`Add ${normalizedSymbol} to portfolio`} onClose={() => setVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <AppText tone="secondary">Save a manual research position. This does not place a trade or connect to a brokerage.</AppText>
        <View style={styles.fieldGroup}>
          <AppText variant="caption" tone="secondary">SHARES</AppText>
          <TextInput
            accessibilityLabel="Number of shares"
            keyboardType="decimal-pad"
            value={shares}
            onChangeText={setShares}
            placeholder="1"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
          />
        </View>
        <View style={styles.fieldGroup}>
          <AppText variant="caption" tone="secondary">AVERAGE COST</AppText>
          <TextInput
            accessibilityLabel="Average cost per share"
            keyboardType="decimal-pad"
            value={averageCost}
            onChangeText={setAverageCost}
            placeholder={stock.price.toFixed(2)}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
          />
        </View>
        <Card padding="md">
          <AppText variant="caption" tone="muted">ESTIMATED POSITION VALUE</AppText>
          <AppText variant="title">{valid ? `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</AppText>
        </Card>
        {addHolding.error && <AppText style={styles.error}>{addHolding.error.message}</AppText>}
        <View style={styles.actions}>
          <View style={styles.flex}><Button label="Cancel" variant="ghost" onPress={() => setVisible(false)} /></View>
          <View style={styles.flex}><Button label="Add position" loading={addHolding.isPending} disabled={!valid} onPress={save} /></View>
        </View>
      </KeyboardAvoidingView>
    </AppModal>
    <AppModal visible={removeVisible} title={`Remove ${normalizedSymbol}?`} onClose={() => setRemoveVisible(false)}>
      <AppText tone="secondary">This removes the manual position from Portfolio. The company research record, notes, and history remain saved.</AppText>
      {removeHolding.error && <AppText style={styles.error}>{removeHolding.error.message}</AppText>}
      <View style={styles.actions}>
        <View style={styles.flex}><Button label="Keep position" variant="ghost" onPress={() => setRemoveVisible(false)} /></View>
        <View style={styles.flex}><Button label="Remove position" loading={removeHolding.isPending} icon="trash-outline" onPress={remove} /></View>
      </View>
    </AppModal>
  </>;
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
  fieldGroup: { gap: theme.spacing.sm },
  input: { minHeight: 48, borderRadius: theme.radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, ...theme.type.body, paddingHorizontal: theme.spacing.lg },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  flex: { flex: 1 },
  error: { color: theme.colors.negative },
});
