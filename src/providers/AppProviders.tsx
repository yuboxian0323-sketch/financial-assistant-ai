import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { migrateDatabase } from '@/database/migrations';
import { InvestmentRepository } from '@/database/repositories';
import { createLocalServices } from '@/services/localServices';
import type { Services } from '@/services/contracts';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });
const ServiceContext = createContext<Services | null>(null);

function ServiceProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const services = useMemo(() => createLocalServices(new InvestmentRepository(database)), [database]);
  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName="investment-os.db" onInit={migrateDatabase} useSuspense>
      <QueryClientProvider client={queryClient}>
        <ServiceProvider>{children}</ServiceProvider>
      </QueryClientProvider>
    </SQLiteProvider>
  );
}

export function useServices(): Services {
  const services = useContext(ServiceContext);
  if (!services) throw new Error('Services are unavailable before application initialization.');
  return services;
}
