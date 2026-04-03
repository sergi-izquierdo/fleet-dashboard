import { AgentTerminalView } from "@/components/AgentTerminalView";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import Link from "next/link";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function AgentTerminalPage({ params }: PageProps) {
  const { name } = await params;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#1a1b26" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Link
          href="/agents"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Agents
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-mono text-green-400">{name}</span>
        <span className="text-white/20">/</span>
        <span className="text-sm text-gray-400">terminal</span>
      </div>
      <div className="flex-1">
        <SectionErrorBoundary sectionName="Terminal">
          <AgentTerminalView sessionName={name} />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
