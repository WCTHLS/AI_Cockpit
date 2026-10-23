import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TableProperties,
  PieChart,
  Users,
  Settings,
  Lock
} from 'lucide-react';
import { Header } from './components/Header';
import { ExecutiveSummaryTab } from './components/ExecutiveSummaryTab';
import { AgentScorecardTab } from './components/AgentScorecardTab';
import { CostBudgetTab } from './components/CostBudgetTab';
import { SeatsAdoptionTab } from './components/SeatsAdoptionTab';
import { AdminTab, SubscriptionConfig, LaborRateConfig } from './components/AdminTab';
import { AgentDetailModal } from './components/AgentDetailModal';
import { LoginPage } from './components/LoginPage';
import {
  fetchSummary,
  fetchByFunction,
  fetchCostBreakdown,
  fetchTrend,
  fetchWhereToAct,
  fetchAgents,
  fetchSeats,
  fetchThresholds,
  loginUser
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

const DEFAULT_SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  m365CopilotPrice: 30.0,
  copilotStudioPackPrice: 200.0,
  copilotStudioIncludedMsgs: 25000,
  githubCopilotPrice: 19.0,
  inputTokenPricePerMillion: 2.50,
  outputTokenPricePerMillion: 10.00
};

const DEFAULT_LABOR_CONFIG: LaborRateConfig = {
  engineering: 95.0,
  finance: 80.0,
  operations: 65.0,
  sales: 85.0,
  customerSupport: 60.0,
  clinical: 90.0,
  monthlyFteHours: 160
};

export const App: React.FC = () => {
  // Default to WCT Executive Light Theme to match v6 reference design
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('wct_cockpit_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [activeTab, setActiveTab] = useState<'summary' | 'scorecard' | 'costs' | 'seats' | 'admin'>('summary');
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');
  const [selectedFunction, setSelectedFunction] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('wct_user');
      return saved ? JSON.parse(saved) : {
        email: 'cxo@wct.com',
        display_name: 'Chief Executive Officer',
        role: 'cxo',
        function_name: null
      };
    } catch {
      return {
        email: 'cxo@wct.com',
        display_name: 'Chief Executive Officer',
        role: 'cxo',
        function_name: null
      };
    }
  });

  // Track session authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('wct_auth_token') || !!localStorage.getItem('wct_user');
  });

  // Department scoping: function_head is locked to their department (e.g. Eng & IT)
  const effFunc = currentUser.role === 'function_head' ? (currentUser.function_name || 'Eng & IT') : selectedFunction;

  // Enterprise Subscription and Labor Config state
  const [subscriptionConfig, setSubscriptionConfig] = useState<SubscriptionConfig>(() => {
    try {
      const saved = localStorage.getItem('wct_subscription_config');
      return saved ? JSON.parse(saved) : DEFAULT_SUBSCRIPTION_CONFIG;
    } catch {
      return DEFAULT_SUBSCRIPTION_CONFIG;
    }
  });

  const [laborConfig, setLaborConfig] = useState<LaborRateConfig>(() => {
    try {
      const saved = localStorage.getItem('wct_labor_config');
      return saved ? JSON.parse(saved) : DEFAULT_LABOR_CONFIG;
    } catch {
      return DEFAULT_LABOR_CONFIG;
    }
  });

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

  // Dynamic portfolio valuation calculation reacting live to custom settings
  const blendedWage = (
    (laborConfig.engineering || 95) * 0.40 +
    (laborConfig.operations || 65) * 0.30 +
    (laborConfig.finance || 80) * 0.15 +
    (laborConfig.sales || 85) * 0.15
  );

  const totalHours = summary?.total_hours_saved || 26000;
  const dynamicGrossValue = totalHours * blendedWage;
  
  // Non-license costs: Platform ($72k) + Tokens ($96k) + Build ($52k) + Enablement ($24k) = $244k
  const baseNonLicense = 244000;
  const pooledSeatCount = seats?.total_licensed_seats || 4600;
  const dynamicLicenseCost = (pooledSeatCount * (subscriptionConfig.m365CopilotPrice || 30)) + (120 * (subscriptionConfig.copilotStudioPackPrice || 200));
  const dynamicTotalCost = baseNonLicense + dynamicLicenseCost;
  const dynamicNetValue = dynamicGrossValue - dynamicTotalCost;
  const dynamicRoiMultiplier = dynamicTotalCost > 0 ? (dynamicGrossValue / dynamicTotalCost) : 0;

  // Sync theme to root DOM node
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wct_cockpit_theme', theme);
  }, [theme]);

  // Load dashboard data scoped to role and function
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [sumData, funcData, costData, trendData, actData, agentList, seatData, thresh] = await Promise.all([
        fetchSummary(currentMonth, effFunc).catch(() => null),
        fetchByFunction(currentMonth).catch(() => []),
        fetchCostBreakdown(currentMonth).catch(() => []),
        fetchTrend(effFunc).catch(() => []),
        fetchWhereToAct(currentMonth, effFunc).catch(() => []),
        fetchAgents({
          month: currentMonth,
          function: effFunc,
          action: scorecardActionFilter
        }).catch(() => []),
        fetchSeats(effFunc, subscriptionConfig.m365CopilotPrice).catch(() => null),
        fetchThresholds().catch(() => null)
      ]);

      setSummary(sumData);
      setByFunction(funcData);
      setCostBreakdown(costData);
      setTrend(trendData);
      setWhereToAct(actData);
      setAgents(agentList);
      setSeats(seatData);
      setThresholds(thresh);
    } catch (err) {
      console.error('Error fetching Cockpit dashboard telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [currentMonth, selectedFunction, currentUser, scorecardActionFilter, isAuthenticated]);

  const handleFilterAction = (action: string) => {
    setScorecardActionFilter(action);
    setActiveTab('scorecard');
  };

  const handleUserChange = async (newUser: UserProfile) => {
    setCurrentUser(newUser);
    localStorage.setItem('wct_user', JSON.stringify(newUser));
    if (newUser.role === 'function_head') {
      setSelectedFunction(newUser.function_name || 'Eng & IT');
    } else {
      setSelectedFunction('');
    }
    // Attempt silent background token refresh for seamless RBAC API verification
    try {
      await loginUser(newUser.email, 'demo');
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('wct_auth_token');
    localStorage.removeItem('wct_user');
    setIsAuthenticated(false);
  };

  // If unauthenticated, render the full Enterprise Sign-in experience
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          if (user.role === 'function_head') {
            setSelectedFunction(user.function_name || 'Eng & IT');
          } else {
            setSelectedFunction('');
          }
        }}
        theme={theme}
      />
    );
  }

  const isLight = theme === 'light';

  return (
    <div className="cockpit-container">
      {/* Global Header */}
      <Header
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        selectedFunction={effFunc}
        onFunctionChange={setSelectedFunction}
        user={currentUser}
        onUserChange={handleUserChange}
        onLogout={handleLogout}
        onRefresh={loadDashboardData}
        isLoading={isLoading}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Navigation Tabs */}
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
            customNetValue={dynamicNetValue}
            customTotalCost={dynamicTotalCost}
            customGrossValue={dynamicGrossValue}
            customRoi={dynamicRoiMultiplier}
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
            customTotalCost={dynamicTotalCost}
            customLicenseCost={dynamicLicenseCost}
            theme={theme}
          />
        )}

        {activeTab === 'seats' && (
          <SeatsAdoptionTab
            seats={seats}
            selectedFunction={effFunc}
            customCostPerSeat={subscriptionConfig.m365CopilotPrice}
            onCostPerSeatChange={(cost) => {
              setSubscriptionConfig({ ...subscriptionConfig, m365CopilotPrice: cost });
              fetchSeats(effFunc, cost).then(res => setSeats(res)).catch(() => {});
            }}
            theme={theme}
            user={currentUser}
          />
        )}

        {activeTab === 'admin' && (
          <AdminTab
            initialThresholds={thresholds}
            onThresholdsUpdated={loadDashboardData}
            onConfigSaved={(subs, labor) => {
              setSubscriptionConfig(subs);
              setLaborConfig(labor);
            }}
            theme={theme}
            user={currentUser}
            summary={summary}
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
