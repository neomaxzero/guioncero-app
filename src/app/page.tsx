import { AppHeader } from "@/components/app-header";
import { LogsTable } from "@/components/logs-table";

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <main>
        <LogsTable />
      </main>
    </div>
  );
}
