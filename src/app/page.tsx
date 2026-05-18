import { AppHeader } from "@/components/app-header";
import { LogsHistogram } from "@/components/logs-histogram";
import { LogsTable } from "@/components/logs-table";

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <main className="flex h-[calc(100dvh-2.5rem)] min-h-0 flex-col">
        <LogsHistogram />
        <LogsTable />
      </main>
    </div>
  );
}
