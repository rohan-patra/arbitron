import ArbitrageOpportunities from "~/components/dashboard/arbitrage-opportunities";
import PortfolioOverview from "~/components/dashboard/portfolio-overview";
import ActiveStrategies from "~/components/dashboard/active-strategies";
import AIAgentStatus from "~/components/dashboard/ai-agent-status";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <ArbitrageOpportunities />
        <ActiveStrategies />
      </div>
      <div className="space-y-6">
        <PortfolioOverview />
        <AIAgentStatus />
      </div>
    </div>
  );
}
