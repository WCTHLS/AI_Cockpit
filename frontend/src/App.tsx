import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TableProperties,
  PieChart,
  Users,
  Settings
} from 'lucide-react';
import { Header } from './components/Header';
import { ExecutiveSummaryTab } from './components/ExecutiveSummaryTab';
import { AgentScorecardTab } from './components/AgentScorecardTab';
import { CostBudgetTab } from './components/CostBudgetTab';
import { SeatsAdoptionTab } from './components/SeatsAdoptionTab';
import { AdminTab } from './components/AdminTab';
import { AgentDetailModal } from './components/AgentDetailModal';
import {
  fetchSummary,
  fetchByFunction,
  fetchCostBreakdown,
  fetchTrend,
  fetchWhereToAct,
  fetchAgents,
  fetchSeats,
  fetchThresholds
} from './api';
import {
  SummaryKPI,
  FunctionSummary,
  CostBreakdownItem,
  TrendMonth,
  AgentScorecardItem,
  SeatInventorySummary,
  UserProfile
} from './types';

export const App: React.FC = () => {
  // Default to WCT Executive Light Theme to match v6 reference design
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('wct_cockpit_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [activeTab, setActiveTab] = useState<'summary' | 'scorecard' | 'costs' | 'seats' | 'admin'>('summary');
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    email: 'cxo@wct.com',
    display_name: 'Chief Executive Officer',
    role: 'cxo',
    function_name: null
  });

  const effFunc = currentUser.role === 'function_head' ? (currentUser.function_name || '') : selectedFunction;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<SummaryKPI | null>(null);
  const [byFunction, setByFunction] = useState<FunctionSummary[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>([]);
  const [trend, setTrend] = useState<TrendMonth[]>([]);
  const [whereToAct, setWhereToAct] = useState<AgentScorecardItem[]>([]);
  const [agents, setAgents] = useState<AgentScorecardItem[]>([]);
  const [seats, setSeats] = useState<SeatInventorySummary | null>(null);
  const [thresholds, setThresholds] = useState<any>(null);

  const [selectedAgent, setSelectedAgent] = useState<AgentScorecardItem | null>(null);
  const [scorecardActionFilter, setScorecardActionFilter] = useState<string>('');

  // Sync theme to root DOM node
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wct_cockpit_theme', theme);
  }, [theme]);

  // Load dashboard data
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const effFunc = currentUser.role === 'function_head' ? (currentUser.function_name || '') : selectedFunction;
      
      const [sumData, funcData, costData, trendData, actData, agentList, seatData, thresh] = await Promise.all([
        fetchSummary(currentMonth, effFunc).catch(() => null),
        fetchByFunction(currentMonth).catch(() => []),
        fetchCostBreakdown(currentMonth).catch(() => []),
        fetchTrend(effFunc).catch(() => []),
        fetchWhereToAct(currentMonth, effFunc).catch(() => []),
        fetchAgents({ month: currentMonth, function: effFunc }).catch(() => []),
        fetchSeats(effFunc).catch(() => null),
        fetchThresholds().catch(() => null)
      ]);

      if (sumData) setSummary(sumData);
      setByFunction(funcData);
      setCostBreakdown(costData);
      setTrend(trendData);
      setWhereToAct(actData);
      setAgents(agentList);
      if (seatData) setSeats(seatData);
      if (thresh) setThresholds(thresh);
    } catch (e) {
      console.error('Error loading cockpit data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentMonth, selectedFunction, currentUser]);

  const handleFilterAction = (action: string) => {
    setScorecardActionFilter(action);
    setActiveTab('scorecard');
  };

  return (
    <div className="app-container" data-theme={theme}>
      {/* Executive Header */}
      <Header
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        selectedFunction={selectedFunction}
        onFunctionChange={setSelectedFunction}
        user={currentUser}
        onUserChange={setCurrentUser}
        onRefresh={loadDashboardData}
        isLoading={isLoading}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Main Tab Navigation */}
      <div className="nav-tabs-wrapper">
        <div className="nav-tabs-container">
          <button
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <LayoutDashboard size={16} />
            Executive Summary
          </button>
          <button
            className={`tab-button ${activeTab === 'scorecard' ? 'active' : ''}`}
            onClick={() => {
              setScorecardActionFilter('');
              setActiveTab('scorecard');
            }}
          >
            <TableProperties size={16} />
            Agent Scorecard
          </button>
          <button
            className={`tab-button ${activeTab === 'costs' ? 'active' : ''}`}
            onClick={() => setActiveTab('costs')}
          >
            <PieChart size={16} />
            Cost &amp; Budget
          </button>
          <button
            className={`tab-button ${activeTab === 'seats' ? 'active' : ''}`}
            onClick={() => setActiveTab('seats')}
          >
            <Users size={16} />
            Seats &amp; Adoption
          </button>
          <button
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Settings size={16} />
            Admin &amp; Config
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'summary' && (
          <ExecutiveSummaryTab
            summary={summary}
            byFunction={byFunction}
            agents={agents}
            currentMonth={currentMonth}
            selectedFunction={effFunc}
            onSelectAgent={setSelectedAgent}
            onFilterAction={handleFilterAction}
            theme={theme}
          />
        )}

        {activeTab === 'scorecard' && (
          <AgentScorecardTab
            agents={agents}
            onSelectAgent={setSelectedAgent}
            initialActionFilter={scorecardActionFilter}
            selectedFunction={effFunc}
            theme={theme}
          />
        )}

        {activeTab === 'costs' && (
          <CostBudgetTab
            costBreakdown={costBreakdown}
            agents={agents}
            selectedFunction={effFunc}
            theme={theme}
          />
        )}

        {activeTab === 'seats' && (
          <SeatsAdoptionTab
            seats={seats}
            selectedFunction={effFunc}
            onCostPerSeatChange={(cost) => {
              fetchSeats(effFunc, cost).then(res => setSeats(res)).catch(() => {});
            }}
            theme={theme}
          />
        )}

        {activeTab === 'admin' && (
          <AdminTab
            initialThresholds={thresholds}
            onThresholdsUpdated={loadDashboardData}
            theme={theme}
          />
        )}
      </main>

      {/* Agent Detail Inspection Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        theme={theme}
      />
    </div>
  );
};
