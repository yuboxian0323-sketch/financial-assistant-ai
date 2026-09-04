import type { InvestmentRepository } from '@/database/repositories';
import { createDefaultWorkspaceLayout, createWorkspaceService } from '@/services/workspaceService';
import type { WorkspaceLayout } from '@/types/domain';

function repositoryWith(initial: WorkspaceLayout | null = null) {
  let saved = initial;
  const repository = {
    workspaceLayout: jest.fn(async () => saved),
    saveWorkspaceLayout: jest.fn(async (layout: WorkspaceLayout) => { saved = layout; return layout; }),
  } as unknown as InvestmentRepository;
  return { repository, getSaved: () => saved };
}

describe('global Workspace service', () => {
  it('creates and saves the versioned starter layout exactly once', async () => {
    const fake = repositoryWith();
    const service = createWorkspaceService(fake.repository);

    const first = await service.getLayout();
    const second = await service.getLayout();

    expect(first.pages).toHaveLength(3);
    expect(first.pages.flatMap((page) => page.widgets)).toHaveLength(10);
    expect(second.pages.map((page) => page.id)).toEqual(first.pages.map((page) => page.id));
    expect(fake.repository.saveWorkspaceLayout).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(first)).not.toContain('companyId');
  });

  it('autosaves page creation, duplication, reordering, renaming, and deletion', async () => {
    const fake = repositoryWith(createDefaultWorkspaceLayout());
    const service = createWorkspaceService(fake.repository);
    const added = await service.addPage('  My Ideas  ');
    const newPage = added.pages.at(-1)!;
    expect(newPage.name).toBe('My Ideas');

    const duplicated = await service.duplicatePage(added.pages[0]!.id);
    expect(duplicated.pages.at(-1)?.widgets[0]?.id).not.toBe(duplicated.pages[0]?.widgets[0]?.id);
    const moved = await service.movePage(newPage.id, -1);
    expect(moved.pages.findIndex((page) => page.id === newPage.id)).toBe(2);
    const renamed = await service.renamePage(newPage.id, 'Long-term Work');
    expect(renamed.pages.find((page) => page.id === newPage.id)?.name).toBe('Long-term Work');
    const removed = await service.deletePage(newPage.id);
    expect(removed.pages.some((page) => page.id === newPage.id)).toBe(false);
    expect(fake.getSaved()).toEqual(removed);
  });

  it('adds, moves, resizes, configures, and removes widgets without touching company data', async () => {
    const starter = createDefaultWorkspaceLayout();
    starter.pages = [{ id: 'only-page', name: 'Empty', position: 0, widgets: [] }];
    const fake = repositoryWith(starter);
    const service = createWorkspaceService(fake.repository);

    const added = await service.addWidget('only-page', 'latest-news', 'medium', { articleCount: 5 });
    const first = added.pages[0]!.widgets[0]!;
    await service.addWidget('only-page', 'notes', 'small', {});
    await service.addWidget('only-page', 'stock-quote', 'small', {});
    await service.addWidget('only-page', 'ai-risks', 'medium', {});
    const moved = await service.moveWidget('only-page', first.id, 1);
    expect(moved.pages[0]?.widgets[1]?.id).toBe(first.id);
    const resized = await service.resizeWidget('only-page', first.id, 'large');
    expect(resized.pages[0]?.widgets.find((item) => item.id === first.id)?.size).toBe('large');
    const configured = await service.updateWidgetSettings('only-page', first.id, { articleCount: 20 });
    expect(configured.pages[0]?.widgets.find((item) => item.id === first.id)?.settings.articleCount).toBe(20);
    const removed = await service.removeWidget('only-page', first.id);
    expect(removed.pages[0]?.widgets.some((item) => item.id === first.id)).toBe(false);
    await expect(service.deletePage('only-page')).rejects.toThrow('at least one page');
  });
});
