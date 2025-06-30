import { AgentDashboard } from '../../components/agents/AgentDashboard';

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <AgentDashboard />
    </div>
  );
}

export const metadata = {
  title: 'Multi-Agent Arbitrage Framework | Arbitron',
  description: 'Watch AI agents collaborate to find and allocate arbitrage opportunities using natural language communication',
}; 