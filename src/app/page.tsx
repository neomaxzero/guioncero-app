import { AppHeader } from "@/components/app-header";

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <main className="min-h-[calc(100dvh-2.5rem)]" />
    </div>
  );
}
