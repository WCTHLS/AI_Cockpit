import { normalizeFunction } from './utils/functionNormalize';
import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  TableProperties,
  PieChart,
  Users,
  Settings,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
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
  loginUser,
  syncClaudeTelemetry
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
  const [currentMonth, setCurrentMonth] = useState<string>('2026-10');
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [cohort, setCohort] = useState<'enterprise' | 'pilot'>('enterprise');

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
  const isDeptLocked = currentUser.role === 'function_head' || currentUser.role === 'finops';
  const lockedDeptName = currentUser.role === 'finops' ? 'Finance' : (normalizeFunction(currentUser.function_name) || 'Engineering & IT');
  const effFunc = isDeptLocked ? lockedDeptName : normalizeFunction(selectedFunction);

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

    // Redirect non-admin users away from admin tab
  useEffect(() => {
    if (currentUser.role !== 'admin' && activeTab === 'admin') {
      setActiveTab('summary');
    }
  }, [currentUser.role, activeTab]);

  // Instant Hydration from local persistent cache (eliminates 0s on load/refresh)
  const getInitialCache = () => {
    try {
      const saved = localStorage.getItem('wct_dashboard_cache_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.sumData) return parsed;
      }
    } catch {}
    return null;
  };

  const initialCache = React.useMemo(() => getInitialCache(), []);

  const [isLoading, setIsLoading] = useState<boolean>(!initialCache);
  const [summary, setSummary] = useState<SummaryKPI | null>(() => initialCache?.sumData || null);
  const [byFunction, setByFunction] = useState<FunctionSummary[]>(() => initialCache?.funcData || []);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>(() => initialCache?.costData || []);
  const [trend, setTrend] = useState<TrendMonth[]>(() => initialCache?.trendData || []);
  const [whereToAct, setWhereToAct] = useState<AgentScorecardItem[]>(() => initialCache?.actData || []);
  const [agents, setAgents] = useState<AgentScorecardItem[]>(() => initialCache?.agentList || []);
  const [seats, setSeats] = useState<SeatInventorySummary | null>(() => initialCache?.seatData || null);
  const [thresholds, setThresholds] = useState<any>(() => initialCache?.thresh || null);

  const [selectedAgent, setSelectedAgent] = useState<AgentScorecardItem | null>(null);
  const [scorecardActionFilter, setScorecardActionFilter] = useState<string>('');

  // Left Sidebar State (Collapsible & Mobile Drawer) - Defined at top level to satisfy Rules of Hooks
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wct_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('wct_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const getActiveTabTitle = (tab: string) => {
    switch (tab) {
      case 'summary': return 'Executive Summary';
      case 'scorecard': return 'Agent Scorecard';
      case 'costs': return 'Cost & Budget';
      case 'seats': return 'Seats & Adoption';
      case 'admin': return 'Admin & Config';
      default: return 'AI Cockpit';
    }
  };

  // Dynamic portfolio totals directly computed from database-backed summary and active agents
  const totalHours = summary?.total_hours_saved ?? (agents.reduce((acc, a) => acc + (a.hours_saved || 0), 0));
  const dynamicGrossValue = summary?.total_gross_value ?? (agents.reduce((acc, a) => acc + (a.gross_value || 0), 0));
  const dynamicTotalCost = summary?.total_cost ?? (agents.reduce((acc, a) => acc + (a.cost || 0), 0));
  const dynamicNetValue = summary?.total_net_value ?? (dynamicGrossValue - dynamicTotalCost);
  const dynamicRoiMultiplier = dynamicTotalCost > 0 ? (dynamicGrossValue / dynamicTotalCost) : (summary?.roi_ratio || 0);
  const dynamicLicenseCost = agents.reduce((acc, a) => acc + (a.cost || 0), 0);

  const navTabsRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (direction: 'left' | 'right') => {
    if (navTabsRef.current) {
      navTabsRef.current.scrollBy({
        left: direction === 'left' ? -180 : 180,
        behavior: 'smooth'
      });
    }
  };

  // Sync theme to root DOM node
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wct_cockpit_theme', theme);
  }, [theme]);

  // In-memory instant client-side cache for 0ms cohort switching
  const cohortCacheRef = React.useRef<Record<string, any>>({});

  const handleCohortChange = (newCohort: 'enterprise' | 'pilot') => {
    setCohort(newCohort);
    const cacheKey = `${currentMonth}:${effFunc}:${newCohort}:${scorecardActionFilter}`;
    if (cohortCacheRef.current[cacheKey]) {
      const cached = cohortCacheRef.current[cacheKey];
      setSummary(cached.sumData);
      setByFunction(cached.funcData);
      setCostBreakdown(cached.costData);
      setTrend(cached.trendData);
      setWhereToAct(cached.actData);
      setAgents(cached.agentList);
      setSeats(cached.seatData);
      setThresholds(cached.thresh);
    }
  };

  // Load dashboard data scoped to role and function (with optional Claude API live sync)
  const loadDashboardData = async (triggerClaudeSync: boolean = false, targetCohort?: 'enterprise' | 'pilot') => {
    const activeCohort = targetCohort || cohort;
    const cacheKey = `${currentMonth}:${effFunc}:${activeCohort}:${scorecardActionFilter}`;

    // If already in cache, switch instantly without showing a blanking spinner
    if (cohortCacheRef.current[cacheKey]) {
      const cached = cohortCacheRef.current[cacheKey];
      setSummary(cached.sumData);
      setByFunction(cached.funcData);
      setCostBreakdown(cached.costData);
      setTrend(cached.trendData);
      setWhereToAct(cached.actData);
      setAgents(cached.agentList);
      setSeats(cached.seatData);
      setThresholds(cached.thresh);
    } else {
      setIsLoading(true);
    }

    try {
      if (triggerClaudeSync) {
        await syncClaudeTelemetry().catch((err) => console.log('Auto Claude sync skipped/error:', err));
      }
      const [sumData, funcData, costData, trendData, actData, agentList, seatData, thresh] = await Promise.all([
        fetchSummary(currentMonth, effFunc, activeCohort).catch(() => null),
        fetchByFunction(currentMonth, activeCohort).catch(() => []),
        fetchCostBreakdown(currentMonth, activeCohort).catch(() => []),
        fetchTrend(effFunc, activeCohort).catch(() => []),
        fetchWhereToAct(currentMonth, effFunc, activeCohort).catch(() => []),
        fetchAgents({
          month: currentMonth,
          function: effFunc,
          cohort: activeCohort,
          action: scorecardActionFilter
        }).catch(() => []),
        fetchSeats(effFunc, subscriptionConfig.m365CopilotPrice, activeCohort).catch(() => null),
        fetchThresholds().catch(() => null)
      ]);

      cohortCacheRef.current[cacheKey] = { sumData, funcData, costData, trendData, actData, agentList, seatData, thresh };
      try {
        if (!effFunc && activeCohort === 'enterprise' && sumData) {
          localStorage.setItem('wct_dashboard_cache_v2', JSON.stringify({ sumData, funcData, costData, trendData, actData, agentList, seatData, thresh }));
        }
      } catch {}

      setSummary(sumData);
      setByFunction(funcData);
      setCostBreakdown(costData);
      setTrend(trendData);
      setWhereToAct(actData);
      setAgents(agentList);
      setSeats(seatData);
      setThresholds(thresh);

      // Keep open selectedAgent in sync with freshly fetched metrics
      setSelectedAgent(prev => {
        if (!prev) return null;
        const fresh = agentList.find((a: any) => a.id === prev.id || a.name === prev.name);
        return fresh || prev;
      });
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
  }, [currentMonth, selectedFunction, currentUser, scorecardActionFilter, isAuthenticated, cohort]);

  // Always scroll to top when switching tab or persona
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const viewport = document.querySelector('.cockpit-main-viewport');
    if (viewport) viewport.scrollTop = 0;
    const main = document.querySelector('.main-content');
    if (main) main.scrollTop = 0;
  }, [activeTab]);

  // When switching user profile/persona, guarantee redirect to exact home page ('summary'), close any mobile menus, and scroll to top
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveTab('summary');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const viewport = document.querySelector('.cockpit-main-viewport');
    if (viewport) viewport.scrollTop = 0;
    const main = document.querySelector('.main-content');
    if (main) main.scrollTop = 0;
  }, [currentUser.email]);

  const handleFilterAction = (action: string) => {
    setScorecardActionFilter(action);
    setActiveTab('scorecard');
    setIsMobileMenuOpen(false);
  };

  const handleUserChange = async (newUser: UserProfile) => {
    setCurrentUser(newUser);
    localStorage.setItem('wct_user', JSON.stringify(newUser));
    setIsMobileMenuOpen(false);
    setActiveTab('summary');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (newUser.role === 'function_head') {
      setSelectedFunction(normalizeFunction(newUser.function_name) || 'Engineering & IT');
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
    setIsMobileMenuOpen(false);
    setActiveTab('summary');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // If unauthenticated, render the full Enterprise Sign-in experience
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setIsMobileMenuOpen(false);
          setActiveTab('summary');
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          if (user.role === 'function_head') {
            setSelectedFunction(normalizeFunction(user.function_name) || 'Engineering & IT');
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
    <div className="cockpit-app-layout">
      {/* Left Collapsible Navigation Sidebar (Option 1) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'scorecard') setScorecardActionFilter('');
          setActiveTab(tab);
        }}
        user={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onThemeChange={setTheme}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Dashboard Viewport */}
      <div className="cockpit-main-viewport">
        {/* Slim Top Bar: Context, Slicers & Quick Switch */}
        <Header
          activeTabTitle={getActiveTabTitle(activeTab)}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          selectedFunction={effFunc}
          onFunctionChange={setSelectedFunction}
          cohort={cohort}
          onCohortChange={handleCohortChange}
          user={currentUser}
          onLogout={handleLogout}
          onRefresh={() => loadDashboardData(true)}
          isLoading={isLoading}
          theme={theme}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

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
            customGrossValue={dynamicGrossValue}
            customHoursSaved={totalHours}
            customLicenseCost={dynamicLicenseCost}
            theme={theme}
            summary={summary}
            currentMonth={currentMonth}
            cohort={cohort}
          />
        )}

        {activeTab === 'seats' && (
          <SeatsAdoptionTab
            seats={seats}
            selectedFunction={effFunc}
            cohort={cohort}
            customCostPerSeat={subscriptionConfig.m365CopilotPrice}
            onCostPerSeatChange={(cost) => {
              setSubscriptionConfig({ ...subscriptionConfig, m365CopilotPrice: cost });
              fetchSeats(effFunc, cost, cohort).then(res => setSeats(res)).catch(() => {});
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
            cohort={cohort}
          />
        )}
        </main>
      </div>

      {/* Agent Detail Inspection Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onRefreshMetrics={async () => {
          await loadDashboardData(false);
        }}
        theme={theme}
      />
    </div>
  );
};
