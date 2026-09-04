import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/providers/AppProviders';
import type { CompanyContent, ResearchTask, ResearchTaskDraft, StockHistoryRange, WorkspaceLayout, WorkspaceWidgetSettings, WorkspaceWidgetSize, WorkspaceWidgetType } from '@/types/domain';
import { normalizeStockSymbol, normalizeStockSymbols } from '@/utils/stocks';

export function useCompanies(search = '') {
  const { company } = useServices();
  return useQuery({ queryKey: ['companies', search], queryFn: () => company.search(search), refetchInterval: 60_000 });
}
export function useCompany(id: string, enabled = true) {
  const { company } = useServices();
  return useQuery({ queryKey: ['company', id], queryFn: () => company.getById(id), enabled: enabled && Boolean(id), refetchInterval: 60_000 });
}
export function useCompanyContent(id: string, kind?: CompanyContent['kind']) {
  const { company } = useServices();
  return useQuery({ queryKey: ['company-content', id, kind], queryFn: () => company.getContent(id, kind) });
}
export function usePortfolio() {
  const { portfolio } = useServices();
  return useQuery({ queryKey: ['portfolio'], queryFn: portfolio.getHoldings, refetchInterval: 60_000 });
}
export function usePortfolioOverview() {
  const { portfolio } = useServices();
  return useQuery({ queryKey: ['portfolio-overview'], queryFn: portfolio.getOverview, refetchInterval: 60_000 });
}
export function useAddPortfolioHolding() {
  const { portfolio } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: portfolio.addHolding,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['session-brief'] }),
        queryClient.invalidateQueries({ queryKey: ['companies'] }),
      ]);
    },
  });
}
export function useRemovePortfolioHolding() {
  const { portfolio } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: portfolio.removeHolding,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['session-brief'] }),
      ]);
    },
  });
}
export function useSessionBrief() {
  const { sessionBrief } = useServices();
  return useQuery({ queryKey: ['session-brief'], queryFn: sessionBrief.getBrief, refetchInterval: 60_000 });
}
export function useDatabaseInfo() {
  const { settings } = useServices();
  return useQuery({ queryKey: ['database-info'], queryFn: settings.getDatabaseInfo });
}
export function useAIAnalysis() {
  const { ai } = useServices();
  return useMutation({ mutationFn: ai.analyzeCompany });
}
export function useNewsAISummary() {
  const { ai } = useServices();
  return useMutation({ mutationFn: ai.summarizeNews });
}
export function useStockSearch(search: string) {
  const { marketData } = useServices();
  const query = search.trim();
  return useQuery({
    queryKey: ['stock-search', query.toLocaleLowerCase()],
    queryFn: () => marketData.searchStocks(query),
    enabled: query.length > 0,
    staleTime: 5 * 60_000,
  });
}
export function useStockQuotes(inputSymbols: string[]) {
  const { marketData } = useServices();
  const symbols = normalizeStockSymbols(inputSymbols);
  return useQuery({
    queryKey: ['stock-quotes', ...symbols],
    queryFn: () => marketData.getQuotes(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
  });
}
export function useStockHistory(symbol: string, range: StockHistoryRange, enabled = true) {
  const { marketData } = useServices();
  const normalizedSymbol = normalizeStockSymbol(symbol);
  return useQuery({
    queryKey: ['stock-history', normalizedSymbol, range],
    queryFn: () => marketData.getHistory(normalizedSymbol, range),
    enabled: enabled && normalizedSymbol.length > 0,
    staleTime: range === '1H' || range === '1D' ? 60_000 : 5 * 60_000,
  });
}

export function useCompanyMarketOverview(symbol: string) {
  const { marketData } = useServices();
  const normalizedSymbol = normalizeStockSymbol(symbol);
  return useQuery({
    queryKey: ['company-market-overview', normalizedSymbol],
    queryFn: () => marketData.getCompanyOverview(normalizedSymbol),
    enabled: normalizedSymbol.length > 0,
    staleTime: 60 * 60_000,
  });
}

export function useCompanyNews(symbol: string) {
  const { news } = useServices();
  const normalizedSymbol = normalizeStockSymbol(symbol);
  return useQuery({
    queryKey: ['company-news', normalizedSymbol],
    queryFn: () => news.getCompanyNews(normalizedSymbol),
    enabled: normalizedSymbol.length > 0,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}

export function useResearchTasks() {
  const { researchTasks } = useServices();
  return useQuery({ queryKey: ['research-tasks'], queryFn: researchTasks.getTasks });
}

export function useResearchTask(id: string) {
  const { researchTasks } = useServices();
  return useQuery({ queryKey: ['research-task', id], queryFn: () => researchTasks.getTask(id), enabled: Boolean(id) });
}

export function useLatestResearchTaskOutputs() {
  const { researchTasks } = useServices();
  return useQuery({ queryKey: ['research-task-outputs'], queryFn: researchTasks.getLatestOutputs });
}

export function useStructureResearchTask() {
  const { ai } = useServices();
  return useMutation({ mutationFn: (prompt: string) => ai.structureResearchTask(prompt) });
}

function useInvalidateResearchTasks() {
  const queryClient = useQueryClient();
  return async (id?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['research-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['research-task-outputs'] }),
      ...(id ? [queryClient.invalidateQueries({ queryKey: ['research-task', id] })] : []),
    ]);
  };
}

export function useCreateResearchTask() {
  const { researchTasks } = useServices();
  const invalidate = useInvalidateResearchTasks();
  return useMutation({
    mutationFn: ({ prompt, draft }: { prompt: string; draft: ResearchTaskDraft }) => researchTasks.createTask(prompt, draft),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateResearchTask() {
  const { researchTasks } = useServices();
  const invalidate = useInvalidateResearchTasks();
  return useMutation({ mutationFn: (task: ResearchTask) => researchTasks.updateTask(task), onSuccess: (task) => invalidate(task.id) });
}

export function useToggleResearchTask() {
  const { researchTasks } = useServices();
  const invalidate = useInvalidateResearchTasks();
  return useMutation({ mutationFn: (id: string) => researchTasks.toggleTask(id), onSuccess: (task) => invalidate(task.id) });
}

export function useDuplicateResearchTask() {
  const { researchTasks } = useServices();
  const invalidate = useInvalidateResearchTasks();
  return useMutation({ mutationFn: (id: string) => researchTasks.duplicateTask(id), onSuccess: () => invalidate() });
}

export function useDeleteResearchTask() {
  const { researchTasks } = useServices();
  const invalidate = useInvalidateResearchTasks();
  return useMutation({ mutationFn: (id: string) => researchTasks.deleteTask(id), onSuccess: () => invalidate() });
}

export function useRunResearchTask() {
  const { researchTasks } = useServices();
  const invalidate = useInvalidateResearchTasks();
  return useMutation({ mutationFn: (id: string) => researchTasks.runTask(id), onSuccess: (output) => invalidate(output.taskId) });
}

export function useTestResearchNotification() {
  const { notifications } = useServices();
  return useMutation({ mutationFn: notifications.sendTestNotification });
}

const workspaceQueryKey = ['workspace-layout'] as const;

export function useWorkspaceLayout() {
  const { workspace } = useServices();
  return useQuery({ queryKey: workspaceQueryKey, queryFn: workspace.getLayout });
}

function useWorkspaceMutation<TInput>(mutationFn: (input: TInput) => Promise<WorkspaceLayout>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (layout) => { queryClient.setQueryData(workspaceQueryKey, layout); },
  });
}

export function useAddWorkspacePage() {
  return useWorkspaceMutation(useServices().workspace.addPage);
}
export function useRenameWorkspacePage() {
  const { workspace } = useServices();
  return useWorkspaceMutation(({ pageId, name }: { pageId: string; name: string }) => workspace.renamePage(pageId, name));
}
export function useDuplicateWorkspacePage() {
  return useWorkspaceMutation(useServices().workspace.duplicatePage);
}
export function useDeleteWorkspacePage() {
  return useWorkspaceMutation(useServices().workspace.deletePage);
}
export function useMoveWorkspacePage() {
  const { workspace } = useServices();
  return useWorkspaceMutation(({ pageId, direction }: { pageId: string; direction: -1 | 1 }) => workspace.movePage(pageId, direction));
}
export function useAddWorkspaceWidget() {
  const { workspace } = useServices();
  return useWorkspaceMutation((input: { pageId: string; type: WorkspaceWidgetType; size: WorkspaceWidgetSize; settings: WorkspaceWidgetSettings }) =>
    workspace.addWidget(input.pageId, input.type, input.size, input.settings));
}
export function useRemoveWorkspaceWidget() {
  const { workspace } = useServices();
  return useWorkspaceMutation(({ pageId, widgetId }: { pageId: string; widgetId: string }) => workspace.removeWidget(pageId, widgetId));
}
export function useMoveWorkspaceWidget() {
  const { workspace } = useServices();
  return useWorkspaceMutation(({ pageId, widgetId, toIndex }: { pageId: string; widgetId: string; toIndex: number }) => workspace.moveWidget(pageId, widgetId, toIndex));
}
export function useResizeWorkspaceWidget() {
  const { workspace } = useServices();
  return useWorkspaceMutation(({ pageId, widgetId, size }: { pageId: string; widgetId: string; size: WorkspaceWidgetSize }) => workspace.resizeWidget(pageId, widgetId, size));
}
export function useUpdateWorkspaceWidgetSettings() {
  const { workspace } = useServices();
  return useWorkspaceMutation(({ pageId, widgetId, settings }: { pageId: string; widgetId: string; settings: WorkspaceWidgetSettings }) => workspace.updateWidgetSettings(pageId, widgetId, settings));
}
