import type { InvestmentRepository } from '@/database/repositories';
import type { WorkspaceService } from '@/services/contracts';
import {
  AppError,
  type WorkspaceLayout,
  type WorkspacePage,
  type WorkspaceWidget,
  type WorkspaceWidgetSize,
  type WorkspaceWidgetType,
} from '@/types/domain';

const widgetTypes: WorkspaceWidgetType[] = [
  'ai-summary', 'ai-opportunities', 'ai-risks', 'investment-thesis', 'stock-quote', 'price-chart', 'trading-range', 'key-metrics', 'revenue', 'latest-news',
  'company-overview', 'notes', 'latest-report', 'active-tasks', 'compare-companies',
];
const widgetSizes: WorkspaceWidgetSize[] = ['small', 'medium', 'large'];

function now(): string { return new Date().toISOString(); }
function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}
function widget(type: WorkspaceWidgetType, size: WorkspaceWidgetSize, position: number, settings: WorkspaceWidget['settings'] = {}): WorkspaceWidget {
  return { id: `workspace-${type}-${position + 1}`, type, size, position, settings };
}

/** The starter layout is global. Widgets resolve their data from the company route at render time. */
export function createDefaultWorkspaceLayout(): WorkspaceLayout {
  return {
    version: 1,
    updatedAt: now(),
    pages: [
      {
        id: 'workspace-page-research', name: 'Research', position: 0,
        widgets: [
          widget('ai-summary', 'large', 0, { summaryLength: 'standard' }),
          widget('company-overview', 'medium', 1),
          widget('investment-thesis', 'large', 2),
          widget('notes', 'medium', 3),
        ],
      },
      {
        id: 'workspace-page-financials', name: 'Financials', position: 1,
        widgets: [
          widget('key-metrics', 'large', 0),
          widget('revenue', 'medium', 1, { period: 'annual' }),
          widget('compare-companies', 'medium', 2, { compareWith: 'AMD' }),
        ],
      },
      {
        id: 'workspace-page-updates', name: 'Updates', position: 2,
        widgets: [
          widget('latest-news', 'large', 0, { articleCount: 5 }),
          widget('latest-report', 'medium', 1),
          widget('active-tasks', 'medium', 2),
        ],
      },
    ],
  };
}

function normalizePage(page: WorkspacePage, pagePosition: number): WorkspacePage {
  return {
    ...page,
    position: pagePosition,
    widgets: page.widgets.map((item, widgetPosition) => ({ ...item, position: widgetPosition })),
  };
}
function normalized(layout: WorkspaceLayout): WorkspaceLayout {
  return { ...layout, pages: layout.pages.map(normalizePage) };
}
function isLayout(value: unknown): value is WorkspaceLayout {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkspaceLayout>;
  return candidate.version === 1 && Array.isArray(candidate.pages) && candidate.pages.length > 0
    && candidate.pages.every((page) => Boolean(page?.id) && typeof page.name === 'string' && Array.isArray(page.widgets)
      && page.widgets.every((item) => Boolean(item?.id) && widgetTypes.includes(item.type) && widgetSizes.includes(item.size)));
}
function cleanName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) throw new AppError('SERVICE', 'Enter a page name.', false);
  return cleaned.slice(0, 32);
}
function pageOrThrow(layout: WorkspaceLayout, pageId: string): WorkspacePage {
  const page = layout.pages.find((item) => item.id === pageId);
  if (!page) throw new AppError('NOT_FOUND', 'Workspace page not found.', false);
  return page;
}

/** Creates the autosaving service used by Query hooks and keeps SQLite details out of UI code. */
export function createWorkspaceService(repository: InvestmentRepository): WorkspaceService {
  async function load(): Promise<WorkspaceLayout> {
    try {
      const saved = await repository.workspaceLayout();
      if (isLayout(saved)) return normalized(saved);
      const starter = createDefaultWorkspaceLayout();
      return repository.saveWorkspaceLayout(starter);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('DATABASE', error instanceof Error ? error.message : 'Workspace layout could not be loaded.');
    }
  }
  async function save(layout: WorkspaceLayout): Promise<WorkspaceLayout> {
    try { return await repository.saveWorkspaceLayout({ ...normalized(layout), updatedAt: now() }); }
    catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('DATABASE', error instanceof Error ? error.message : 'Workspace changes could not be saved.');
    }
  }
  async function updatePage(pageId: string, transform: (page: WorkspacePage) => WorkspacePage): Promise<WorkspaceLayout> {
    const layout = await load();
    pageOrThrow(layout, pageId);
    return save({ ...layout, pages: layout.pages.map((page) => page.id === pageId ? transform(page) : page) });
  }

  return {
    getLayout: load,
    addPage: async (name) => {
      const layout = await load();
      const page: WorkspacePage = { id: id('workspace-page'), name: cleanName(name), position: layout.pages.length, widgets: [] };
      return save({ ...layout, pages: [...layout.pages, page] });
    },
    renamePage: (pageId, name) => updatePage(pageId, (page) => ({ ...page, name: cleanName(name) })),
    duplicatePage: async (pageId) => {
      const layout = await load();
      const source = pageOrThrow(layout, pageId);
      const copy: WorkspacePage = {
        ...source,
        id: id('workspace-page'),
        name: `${source.name.slice(0, 27)} Copy`,
        position: layout.pages.length,
        widgets: source.widgets.map((item, position) => ({ ...item, id: id('workspace-widget'), position, settings: { ...item.settings } })),
      };
      return save({ ...layout, pages: [...layout.pages, copy] });
    },
    deletePage: async (pageId) => {
      const layout = await load();
      pageOrThrow(layout, pageId);
      if (layout.pages.length === 1) throw new AppError('SERVICE', 'A workspace needs at least one page.', false);
      return save({ ...layout, pages: layout.pages.filter((page) => page.id !== pageId) });
    },
    movePage: async (pageId, direction) => {
      const layout = await load();
      const from = layout.pages.findIndex((page) => page.id === pageId);
      if (from < 0) throw new AppError('NOT_FOUND', 'Workspace page not found.', false);
      const to = Math.max(0, Math.min(layout.pages.length - 1, from + direction));
      if (from === to) return layout;
      const pages = [...layout.pages];
      const [moved] = pages.splice(from, 1);
      if (moved) pages.splice(to, 0, moved);
      return save({ ...layout, pages });
    },
    addWidget: (pageId, type, size, settings) => updatePage(pageId, (page) => ({
      ...page,
      widgets: [...page.widgets, { id: id('workspace-widget'), type, size, position: page.widgets.length, settings: { ...settings } }],
    })),
    removeWidget: (pageId, widgetId) => updatePage(pageId, (page) => ({ ...page, widgets: page.widgets.filter((item) => item.id !== widgetId) })),
    moveWidget: (pageId, widgetId, toIndex) => updatePage(pageId, (page) => {
      const from = page.widgets.findIndex((item) => item.id === widgetId);
      if (from < 0) throw new AppError('NOT_FOUND', 'Workspace widget not found.', false);
      const target = Math.max(0, Math.min(page.widgets.length - 1, toIndex));
      const widgets = [...page.widgets];
      const [moved] = widgets.splice(from, 1);
      if (moved) widgets.splice(target, 0, moved);
      return { ...page, widgets };
    }),
    resizeWidget: (pageId, widgetId, size) => updatePage(pageId, (page) => ({
      ...page, widgets: page.widgets.map((item) => item.id === widgetId ? { ...item, size } : item),
    })),
    updateWidgetSettings: (pageId, widgetId, settings) => updatePage(pageId, (page) => ({
      ...page, widgets: page.widgets.map((item) => item.id === widgetId ? { ...item, settings: { ...item.settings, ...settings } } : item),
    })),
  };
}
