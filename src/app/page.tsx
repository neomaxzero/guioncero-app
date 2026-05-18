import { AppHeader } from "@/components/app-header";
import { LogsWorkspace } from "@/components/logs-workspace";

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <main className="flex h-[calc(100dvh-2.5rem)] min-h-0 flex-col">
        <LogsWorkspace />
      </main>
    </div>
  );
}
