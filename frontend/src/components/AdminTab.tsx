import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Layers,
  CreditCard,
  Briefcase,
  ShieldAlert,
  Zap,
  TrendingUp,
  DollarSign,
  Clock,
  Sparkles,
  HelpCircle,
  Save,
  RotateCcw,
  Lock,
  UploadCloud,
  FileText,
  Download,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  X,
  Server,
  Link2,
  Key,
  Database,
  Eye,
  EyeOff,
  Radio,
  CheckCircle,
  Code,
  Terminal,
  Cpu,
  Bot,
  Copy,
  Plus
} from 'lucide-react';
import { updateThresholds, formatUSD, uploadTelemetryFile, downloadCsvTemplate, fetchClaudeConfig, updateClaudeConfig, syncClaudeTelemetry, formatPct, fetchDeveloperConfig, updateDeveloperConfig, testDeveloperConnection, syncDeveloperTelemetry, fetchDeveloperSeats, uploadTeammateZip, fetchM365Seats, uploadM365Csv, clearM365Seats, M365SeatsResponse, fetchWorkingAgents, fetchWorkingAgentSchema, ingestWorkingAgent, testAgentConnection } from '../api';
import { UserProfile, IngestSummary, SummaryKPI, ClaudeConfig, ClaudeSyncResponse, ClaudeSyncMetrics, DeveloperToolConfig, DeveloperSyncResponse, DeveloperSeat, WorkingAgentItem } from '../types';

interface AdminTabProps {
  initialThresholds: any;
  onThresholdsUpdated: () => void;
  onConfigSaved?: (subs: SubscriptionConfig, labor: LaborRateConfig) => void;
  theme?: 'dark' | 'light';
  user?: UserProfile;
  summary?: SummaryKPI | null;
}

export interface SubscriptionConfig {
  m365CopilotPrice: number;
  copilotStudioPackPrice: number;
  copilotStudioIncludedMsgs: number;
  githubCopilotPrice: number;
  inputTokenPricePerMillion: number;
  outputTokenPricePerMillion: number;
}

export interface LaborRateConfig {
  engineering: number;
  finance: number;
  operations: number;
  sales: number;
  customerSupport: number;
  clinical: number;
  monthlyFteHours: number;
}

export interface GuardrailConfig {
  idleSeatDays: number;
  lapsingWindowMinDays: number;
  lapsingWindowMaxDays: number;
  tokenQuotaAlertPct: number;
  budgetOverrunAlertPct: number;
}

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

const DEFAULT_GUARDRAIL_CONFIG: GuardrailConfig = {
  idleSeatDays: 30,
  lapsingWindowMinDays: 7,
  lapsingWindowMaxDays: 29,
  tokenQuotaAlertPct: 90,
  budgetOverrunAlertPct: 110
};

export const AdminTab: React.FC<AdminTabProps> = ({ initialThresholds, onThresholdsUpdated, onConfigSaved, theme = 'light', user, summary }) => {
  const isAdmin = user ? user.role === 'admin' : true;
  const [activeSection, setActiveSection] = useState<'subs' | 'labor' | 'guardrails' | 'governance' | 'ingestion' | 'developer_tools' | 'working_agents'>('subs');

  // Governance action thresholds
  const [thresholds, setThresholds] = useState<any>(initialThresholds || {
    experiment_days: 60,
    intervene_eval_pass: 88.0,
    intervene_cost_budget_pct: 110.0,
    intervene_value_min: 15000.0,
    accelerate_value_min: 40000.0,
    accelerate_adoption_min: 70.0
  });

  // Enterprise Subscription Config
  const [subscriptions, setSubscriptions] = useState<SubscriptionConfig>(() => {
    const saved = localStorage.getItem('wct_subscription_config');
    return saved ? JSON.parse(saved) : DEFAULT_SUBSCRIPTION_CONFIG;
  });

  // Labor wage & productivity config
  const [laborRates, setLaborRates] = useState<LaborRateConfig>(() => {
    const saved = localStorage.getItem('wct_labor_config');
    return saved ? JSON.parse(saved) : DEFAULT_LABOR_CONFIG;
  });

  // Guardrail config
  const [guardrails, setGuardrails] = useState<GuardrailConfig>(() => {
    const saved = localStorage.getItem('wct_guardrail_config');
    return saved ? JSON.parse(saved) : DEFAULT_GUARDRAIL_CONFIG;
  });


  // Developer AI Tools (Google Gemini / Antigravity / GitHub Copilot) State
  const [devConfig, setDevConfig] = useState<DeveloperToolConfig | null>(null);
  const [devProvider, setDevProvider] = useState<string>('gemini_antigravity');
  const [devConnectionMode, setDevConnectionMode] = useState<string>('local_antigravity');
  const [devEndpointUrl, setDevEndpointUrl] = useState<string>('https://generativelanguage.googleapis.com');

  // Working Agents Onboarding & Ingestion State
  const TICKET_TRIAGE_AGENT_JSON = JSON.stringify({
    "agent_name": "Ticket Triage Agent",
    "business_function": "Eng & IT",
    "team": "IT Service Desk",
    "model": "gpt-4o",
    "input_token_price_per_1m": 2.50,
    "output_token_price_per_1m": 10.00,
    "monthly_infra_cost": 45.00,
    "monthly_budget": 100.00,
    "baseline_employee_hours": 0.25,
    "employee_monthly_rate": 900.00,
    "employee_monthly_working_hours": 160,
    "category": "built_using",
    "agent_type": "workflow_agent",
    "description": "Custom autonomous code-first agent triaging tier-1 IT tickets, Active Directory unlocks, and software provisioning."
  }, null, 2);

  const SUPPLY_CHAIN_COPILOT_AGENT_JSON = JSON.stringify({
    "agent_name": "Global Supply Chain & Order Dispatch Bot",
    "business_function": "Operations",
    "team": "Supply Chain",
    "model": "copilot-studio-v2",
    "input_token_price_per_1m": 0.00,
    "output_token_price_per_1m": 0.00,
    "monthly_infra_cost": 200.00,
    "monthly_budget": 300.00,
    "baseline_employee_hours": 0.33,
    "employee_monthly_rate": 1100.00,
    "employee_monthly_working_hours": 160,
    "category": "built_with",
    "agent_type": "workflow_agent",
    "description": "Microsoft Copilot Studio autonomous workflow bot deployed in Teams for SAP shipment tracking, warehouse inventory checks, and automated RMA parts dispatch."
  }, null, 2);


  // Dedicated Connect New Live Agent / Integration Modal State
  const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    status: 'success' | 'warning' | 'error' | null;
    message: string;
    latency_ms?: number;
  }>({ status: null, message: '' });
  const [isSubmittingNewAgent, setIsSubmittingNewAgent] = useState<boolean>(false);
  const [copilotMethod, setCopilotMethod] = useState<'option_a' | 'option_b'>('option_a');
  const [showJsonIngest, setShowJsonIngest] = useState<boolean>(false);

  const [newAgentForm, setNewAgentForm] = useState({
    provider: 'copilot_studio',
    copilot_method: 'option_a' as 'option_a' | 'option_b',
    agent_name: '',
    business_function: 'Operations',
    team: '',
    category: 'built_with',
    agent_type: 'workflow_agent',
    model: 'copilot-studio-v2',
    // FinOps Benchmarks
    monthly_infra_cost: 200.0,
    monthly_budget: 300.0,
    baseline_employee_hours: 0.33,
    employee_monthly_rate: 1100.0,
    employee_monthly_working_hours: 160,
    target_eval_sla: 92.0,
    assigned_users: 4,
    input_token_price_per_1m: 0.0,
    output_token_price_per_1m: 0.0,
    description: '',
    // Option A: Azure Application Insights
    app_insights_app_id: '',
    app_insights_key: '',
    copilot_bot_id: '',
    // Option B: Microsoft Dataverse OData
    dataverse_url: '',
    tenant_id: '',
    client_id: '',
    client_secret: '',
    // Azure OpenAI
    api_endpoint: '',
    api_key: '',
    deployment_name: 'gpt-4o'
  });

  const handleProviderChange = (provider: string) => {
    if (provider === 'copilot_studio') {
      setNewAgentForm(prev => ({
        ...prev,
        provider,
        category: 'built_with',
        model: 'copilot-studio-v2',
        monthly_infra_cost: 200.0,
        monthly_budget: 300.0,
        baseline_employee_hours: 0.33,
        employee_monthly_rate: 1100.0,
        input_token_price_per_1m: 0.0,
        output_token_price_per_1m: 0.0,
        dataverse_url: '',
        app_insights_app_id: '',
        app_insights_key: '',
        tenant_id: '',
        client_id: '',
        client_secret: '',
        copilot_bot_id: ''
      }));
    } else if (provider === 'azure_openai') {
      setNewAgentForm(prev => ({
        ...prev,
        provider,
        category: 'built_using',
        model: 'gpt-4o',
        monthly_infra_cost: 45.0,
        monthly_budget: 150.0,
        baseline_employee_hours: 0.25,
        employee_monthly_rate: 900.0,
        input_token_price_per_1m: 2.50,
        output_token_price_per_1m: 10.0,
        api_endpoint: '',
        deployment_name: 'gpt-4o'
      }));
    } else if (provider === 'anthropic_claude') {
      setNewAgentForm(prev => ({
        ...prev,
        provider,
        category: 'built_with',
        model: 'claude-3-5-sonnet',
        monthly_infra_cost: 50.0,
        monthly_budget: 200.0,
        baseline_employee_hours: 0.50,
        employee_monthly_rate: 3500.0,
        input_token_price_per_1m: 3.00,
        output_token_price_per_1m: 15.0
      }));
    } else {
      setNewAgentForm(prev => ({
        ...prev,
        provider,
        category: 'built_with',
        model: 'copilot-business',
        monthly_infra_cost: 30.0,
        monthly_budget: 60.0,
        baseline_employee_hours: 0.50,
        employee_monthly_rate: 4000.0,
        input_token_price_per_1m: 0.0,
        output_token_price_per_1m: 0.0
      }));
    }
    setConnectionTestResult({ status: null, message: '' });
  };

  const handleTestNewAgentConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult({ status: null, message: '' });
    try {
      const res = await testAgentConnection({
        provider: newAgentForm.provider,
        copilot_method: copilotMethod,
        copilot_bot_id: newAgentForm.copilot_bot_id,
        dataverse_url: newAgentForm.dataverse_url,
        tenant_id: newAgentForm.tenant_id,
        client_id: newAgentForm.client_id,
        client_secret: newAgentForm.client_secret,
        app_insights_app_id: newAgentForm.app_insights_app_id,
        app_insights_key: newAgentForm.app_insights_key,
        api_endpoint: newAgentForm.api_endpoint,
        api_key: newAgentForm.api_key,
        deployment_name: newAgentForm.deployment_name
      });
      setConnectionTestResult({
        status: res.status as any,
        message: res.message,
        latency_ms: res.latency_ms
      });
    } catch (err: any) {
      setConnectionTestResult({
        status: 'error',
        message: err.message || 'Connection test failed. Check endpoint parameters.'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleCreateNewAgent = async () => {
    if (!newAgentForm.agent_name.trim()) {
      alert('Please enter an Agent Name.');
      return;
    }
    setIsSubmittingNewAgent(true);
    try {
      const payload = {
        agent_name: newAgentForm.agent_name.trim(),
        business_function: newAgentForm.business_function,
        team: newAgentForm.team,
        category: newAgentForm.category,
        agent_type: newAgentForm.agent_type,
        model: newAgentForm.model,
        monthly_infra_cost: Number(newAgentForm.monthly_infra_cost),
        monthly_budget: Number(newAgentForm.monthly_budget),
        baseline_employee_hours: Number(newAgentForm.baseline_employee_hours),
        employee_monthly_rate: Number(newAgentForm.employee_monthly_rate),
        employee_monthly_working_hours: Number(newAgentForm.employee_monthly_working_hours),
        target_eval_sla: Number(newAgentForm.target_eval_sla || 92.0),
        assigned_users: Number(newAgentForm.assigned_users || 4),
        input_token_price_per_1m: Number(newAgentForm.input_token_price_per_1m),
        output_token_price_per_1m: Number(newAgentForm.output_token_price_per_1m),
        description: newAgentForm.description,
        telemetry_config: {
          provider: newAgentForm.provider,
          copilot_method: copilotMethod,
          copilot_bot_id: newAgentForm.copilot_bot_id,
          dataverse_url: newAgentForm.dataverse_url,
          tenant_id: newAgentForm.tenant_id,
          client_id: newAgentForm.client_id,
          app_insights_app_id: newAgentForm.app_insights_app_id,
          api_endpoint: newAgentForm.api_endpoint,
          deployment_name: newAgentForm.deployment_name,
          connected_at: new Date().toISOString()
        }
      };

      await ingestWorkingAgent(payload);
      setWorkingAgentIngestResult({
        type: 'success',
        message: `Successfully connected & registered '${newAgentForm.agent_name}'! Live metrics, budget allocation, and ROI calculations are now active in the dashboard.`
      });
      setIsAddAgentModalOpen(false);
      await loadWorkingAgents();
      if (onThresholdsUpdated) {
        onThresholdsUpdated();
      }
    } catch (err: any) {
      alert(`Failed to register new agent: ${err.message}`);
    } finally {
      setIsSubmittingNewAgent(false);
    }
  };


  const [isEditingExistingAgent, setIsEditingExistingAgent] = useState<boolean>(false);

  const handleOpenTelemetryModal = (ag: WorkingAgentItem) => {
    let configObj: any = null;
    if (ag.config_json) {
      try {
        configObj = JSON.parse(ag.config_json);
      } catch (e) {
        configObj = null;
      }
    }

    const tel = configObj?.telemetry_config || {};
    const isCopilotStudio = ag.category === 'built_with' || 
      ag.name.toLowerCase().includes('supply chain') || 
      ag.name.toLowerCase().includes('copilot') || 
      ag.name.toLowerCase().includes('policy') ||
      tel.provider === 'copilot_studio';

    const provider = isCopilotStudio ? 'copilot_studio' : (tel.provider || 'azure_openai');
    const method = (tel.copilot_method as 'option_a' | 'option_b') || 'option_a';

    setCopilotMethod(method);
    setIsEditingExistingAgent(true);
    setNewAgentForm({
      provider,
      copilot_method: method,
      agent_name: ag.name,
      business_function: ag.business_function || configObj?.business_function || 'Operations',
      team: ag.team || configObj?.team || 'Supply Chain',
      category: ag.category || configObj?.category || 'built_with',
      agent_type: ag.agent_type || configObj?.agent_type || 'workflow_agent',
      model: ag.model || configObj?.model || (isCopilotStudio ? 'copilot-studio-v2' : 'gpt-4o'),
      monthly_infra_cost: ag.monthly_infra_cost ?? configObj?.monthly_infra_cost ?? (ag.name.includes('Supply Chain') ? 200.0 : 45.0),
      monthly_budget: ag.monthly_budget ?? configObj?.monthly_budget ?? (ag.name.includes('Supply Chain') ? 300.0 : 100.0),
      baseline_employee_hours: ag.baseline_employee_hours ?? configObj?.baseline_employee_hours ?? (ag.name.includes('Supply Chain') ? 0.33 : 0.25),
      employee_monthly_rate: ag.employee_monthly_rate ?? configObj?.employee_monthly_rate ?? (ag.name.includes('Supply Chain') ? 1100.0 : 900.0),
      employee_monthly_working_hours: ag.employee_monthly_working_hours ?? configObj?.employee_monthly_working_hours ?? 160,
      target_eval_sla: configObj?.target_eval_sla ?? 92.0,
      assigned_users: configObj?.assigned_users ?? 4,
      input_token_price_per_1m: ag.input_token_price_per_1m ?? configObj?.input_token_price_per_1m ?? 2.50,
      output_token_price_per_1m: ag.output_token_price_per_1m ?? configObj?.output_token_price_per_1m ?? 10.00,
      description: ag.description || configObj?.description || '',
      app_insights_app_id: tel.app_insights_app_id || '',
      app_insights_key: tel.app_insights_key || '',
      copilot_bot_id: tel.copilot_bot_id || '',
      dataverse_url: tel.dataverse_url || '',
      tenant_id: tel.tenant_id || '',
      client_id: tel.client_id || '',
      client_secret: tel.client_secret || '',
      api_endpoint: tel.api_endpoint || '',
      api_key: tel.api_key || '',
      deployment_name: tel.deployment_name || 'gpt-4o'
    });
    setConnectionTestResult({ status: null, message: '' });
    setIsAddAgentModalOpen(true);
  };

  // Dedicated In-UI Direct Agent Values Editor Modal
  const [editingAgent, setEditingAgent] = useState<WorkingAgentItem | null>(null);
  const [agentFormValues, setAgentFormValues] = useState<{
    agent_name: string;
    business_function: string;
    team: string;
    model: string;
    monthly_infra_cost: number;
    monthly_budget: number;
    baseline_employee_hours: number;
    employee_monthly_rate: number;
    employee_monthly_working_hours: number;
    input_token_price_per_1m: number;
    output_token_price_per_1m: number;
    category: string;
    agent_type: string;
    description: string;
  }>({
    agent_name: '',
    business_function: 'Eng & IT',
    team: 'IT Service Desk',
    model: 'gpt-4o',
    monthly_infra_cost: 45,
    monthly_budget: 100,
    baseline_employee_hours: 0.25,
    employee_monthly_rate: 900,
    employee_monthly_working_hours: 160,
    input_token_price_per_1m: 2.5,
    output_token_price_per_1m: 10,
    category: 'built_using',
    agent_type: 'workflow_agent',
    description: ''
  });
  const [isSavingAgentForm, setIsSavingAgentForm] = useState<boolean>(false);

  const handleOpenEditModal = (ag: WorkingAgentItem) => {
    let configObj: any = null;
    if (ag.config_json) {
      try {
        configObj = JSON.parse(ag.config_json);
      } catch (e) {
        configObj = null;
      }
    }
    setEditingAgent(ag);
    setAgentFormValues({
      agent_name: ag.name,
      business_function: ag.business_function || configObj?.business_function || 'Eng & IT',
      team: ag.team || configObj?.team || 'IT Service Desk',
      model: ag.model || configObj?.model || 'gpt-4o',
      monthly_infra_cost: ag.monthly_infra_cost ?? configObj?.monthly_infra_cost ?? (ag.name.includes('Supply Chain') ? 200.0 : 45.0),
      monthly_budget: ag.monthly_budget ?? configObj?.monthly_budget ?? (ag.name.includes('Supply Chain') ? 300.0 : 100.0),
      baseline_employee_hours: ag.baseline_employee_hours ?? configObj?.baseline_employee_hours ?? (ag.name.includes('Supply Chain') ? 0.33 : 0.25),
      employee_monthly_rate: ag.employee_monthly_rate ?? configObj?.employee_monthly_rate ?? (ag.name.includes('Supply Chain') ? 1100.0 : 900.0),
      employee_monthly_working_hours: ag.employee_monthly_working_hours ?? configObj?.employee_monthly_working_hours ?? 160,
      input_token_price_per_1m: ag.input_token_price_per_1m ?? configObj?.input_token_price_per_1m ?? 2.50,
      output_token_price_per_1m: ag.output_token_price_per_1m ?? configObj?.output_token_price_per_1m ?? 10.00,
      category: ag.category || configObj?.category || (ag.name.includes('Supply Chain') ? 'built_with' : 'built_using'),
      agent_type: ag.agent_type || configObj?.agent_type || 'workflow_agent',
      description: ag.description || configObj?.description || ''
    });
  };

  const handleSaveAgentForm = async () => {
    if (!agentFormValues.agent_name.trim()) return;
    try {
      setIsSavingAgentForm(true);
      await ingestWorkingAgent(agentFormValues);
      setWorkingAgentIngestResult({
        type: 'success',
        message: `Successfully saved '${agentFormValues.agent_name}' parameters directly to database! Scorecard & executive metrics recalculated.`
      });
      setEditingAgent(null);
      await loadWorkingAgents();
      if (onThresholdsUpdated) {
        onThresholdsUpdated();
      }
    } catch (err: any) {
      alert(`Failed to save agent to database: ${err.message}`);
    } finally {
      setIsSavingAgentForm(false);
    }
  };

  const [workingAgentJson, setWorkingAgentJson] = useState<string>(TICKET_TRIAGE_AGENT_JSON);
  const [workingAgentsList, setWorkingAgentsList] = useState<WorkingAgentItem[]>([]);
  const [isLoadingWorkingAgents, setIsLoadingWorkingAgents] = useState<boolean>(false);
  const [isIngestingWorkingAgent, setIsIngestingWorkingAgent] = useState<boolean>(false);
  const [workingAgentIngestResult, setWorkingAgentIngestResult] = useState<{ type: 'success' | 'error'; message: string; agents?: any[] } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);

  const loadWorkingAgents = async () => {
    try {
      setIsLoadingWorkingAgents(true);
      const data = await fetchWorkingAgents();
      if (data && data.agents) {
        setWorkingAgentsList(data.agents);
      }
    } catch (err: any) {
      console.error('Failed to load working agents:', err);
    } finally {
      setIsLoadingWorkingAgents(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'working_agents') {
      loadWorkingAgents();
    }
  }, [activeSection]);

  const handleValidateJson = () => {
    try {
      const parsed = JSON.parse(workingAgentJson);
      const item = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!item.agent_name && !item.name) {
        setJsonValidationError("Warning: 'agent_name' is missing in JSON.");
        return false;
      }
      setJsonValidationError(null);
      return true;
    } catch (err: any) {
      setJsonValidationError(`Invalid JSON Syntax: ${err.message}`);
      return false;
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(workingAgentJson);
      setWorkingAgentJson(JSON.stringify(parsed, null, 2));
      setJsonValidationError(null);
    } catch (err: any) {
      setJsonValidationError(`Cannot format: ${err.message}`);
    }
  };

  const handleIngestWorkingAgent = async () => {
    try {
      setWorkingAgentIngestResult(null);
      const isValid = handleValidateJson();
      if (!isValid) return;

      setIsIngestingWorkingAgent(true);
      const parsed = JSON.parse(workingAgentJson);
      const res = await ingestWorkingAgent(parsed);
      setWorkingAgentIngestResult({
        type: 'success',
        message: res.message || 'Successfully saved agent configuration into database.',
        agents: res.agents
      });
      await loadWorkingAgents();
      if (onThresholdsUpdated) {
        onThresholdsUpdated();
      }
    } catch (err: any) {
      setWorkingAgentIngestResult({
        type: 'error',
        message: err.message || 'Failed to save working agent.'
      });
    } finally {
      setIsIngestingWorkingAgent(false);
    }
  };
  const [devApiKey, setDevApiKey] = useState<string>('');
  const [showDevApiKey, setShowDevApiKey] = useState<boolean>(false);
  const [devOrgId, setDevOrgId] = useState<string>('waferwire-corp');
  const [devEmail, setDevEmail] = useState<string>('swagathreddy00@gmail.com');
  const [devLocalPath, setDevLocalPath] = useState<string>('C:\\Users\\Admin\\.gemini\\antigravity-ide');
  const [devAutoSync, setDevAutoSync] = useState<boolean>(true);
  const [isTestingDev, setIsTestingDev] = useState<boolean>(false);
  const [isSavingDev, setIsSavingDev] = useState<boolean>(false);
  const [isSyncingDev, setIsSyncingDev] = useState<boolean>(false);
  const [devTestResult, setDevTestResult] = useState<{ status: string; connected: boolean; message: string; sample_models?: string[]; details?: any } | null>(null);
  const [devSyncResult, setDevSyncResult] = useState<DeveloperSyncResponse | null>(null);
  const [devError, setDevError] = useState<string | null>(null);
  const [devSuccessMessage, setDevSuccessMessage] = useState<string | null>(null);

  // Accordion Toggle States (neat dropdown-style collapsible panels - default closed)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    api_creds: false,
    teammate_import: false,
    m365_admin: false
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // M365 Admin State
  const [adminM365Data, setAdminM365Data] = useState<M365SeatsResponse | null>(null);
  const [adminM365Loading, setAdminM365Loading] = useState<boolean>(false);
  const [showAdminM365ClearModal, setShowAdminM365ClearModal] = useState<boolean>(false);
  const [isClearingAdminM365, setIsClearingAdminM365] = useState<boolean>(false);
  const [isUploadingAdminM365, setIsUploadingAdminM365] = useState<boolean>(false);
  const adminM365FileInputRef = useRef<HTMLInputElement>(null);

  const loadAdminM365 = async () => {
    setAdminM365Loading(true);
    try {
      const res = await fetchM365Seats();
      setAdminM365Data(res);
    } catch (err) {
      console.error('Failed to load M365 admin seats:', err);
    } finally {
      setAdminM365Loading(false);
    }
  };

  useEffect(() => {
    loadAdminM365();
    loadWorkingAgents();
  }, []);

  const handleAdminM365Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAdminM365(true);
    try {
      const res = await uploadM365Csv(file);
      await loadAdminM365();
      if (onThresholdsUpdated) onThresholdsUpdated();
      setDevSuccessMessage(res.message);
      setTimeout(() => setDevSuccessMessage(null), 5000);
    } catch (err: any) {
      setDevError(err.message || 'M365 CSV upload failed');
      setTimeout(() => setDevError(null), 5000);
    } finally {
      setIsUploadingAdminM365(false);
      if (adminM365FileInputRef.current) adminM365FileInputRef.current.value = '';
    }
  };

  const handleAdminM365Clear = async () => {
    setIsClearingAdminM365(true);
    try {
      const res = await clearM365Seats();
      await loadAdminM365();
      if (onThresholdsUpdated) onThresholdsUpdated();
      setShowAdminM365ClearModal(false);
      setDevSuccessMessage(res.message);
      setTimeout(() => setDevSuccessMessage(null), 5000);
    } catch (err: any) {
      setDevError(err.message || 'Failed to clear M365 records');
      setTimeout(() => setDevError(null), 5000);
    } finally {
      setIsClearingAdminM365(false);
    }
  };

  useEffect(() => {
    fetchDeveloperConfig()
      .then(cfg => {
        setDevConfig(cfg);
        if (cfg.provider) setDevProvider(cfg.provider);
        if (cfg.connection_mode) setDevConnectionMode(cfg.connection_mode);
        if (cfg.endpoint_url) setDevEndpointUrl(cfg.endpoint_url);
        if (cfg.org_or_project_id) setDevOrgId(cfg.org_or_project_id);
        if (cfg.developer_email) setDevEmail(cfg.developer_email);
        if (cfg.local_data_path) setDevLocalPath(cfg.local_data_path);
        setDevAutoSync(cfg.auto_sync_on_refresh);
        if (cfg.last_sync_metrics) {
          setDevSyncResult({
            status: 'success',
            synced_at: cfg.last_synced_at || '',
            provider: cfg.provider,
            developer: cfg.last_sync_metrics.developer_name || 'Swagath Reddy',
            developer_email: cfg.last_sync_metrics.developer_email || 'swagathreddy00@gmail.com',
            metrics: cfg.last_sync_metrics,
            message: 'Loaded previous developer telemetry synchronization.'
          });
        }
      })
      .catch(err => console.error('Failed to load developer tools config:', err));
  }, []);

  const handleTestDevConnection = async () => {
    setIsTestingDev(true);
    setDevError(null);
    setDevTestResult(null);
    try {
      const res = await testDeveloperConnection({
        provider: devProvider,
        connection_mode: devConnectionMode,
        endpoint_url: devEndpointUrl,
        api_key: devApiKey || undefined,
        org_or_project_id: devOrgId,
        local_data_path: devLocalPath
      });
      setDevTestResult(res);
    } catch (err: any) {
      setDevError(err.message || 'Connection test failed');
    } finally {
      setIsTestingDev(false);
    }
  };

  const handleSaveDevConfig = async () => {
    setIsSavingDev(true);
    setDevError(null);
    setDevSuccessMessage(null);
    try {
      await updateDeveloperConfig({
        provider: devProvider,
        connection_mode: devConnectionMode,
        endpoint_url: devEndpointUrl,
        api_key: devApiKey || undefined,
        org_or_project_id: devOrgId,
        developer_email: devEmail,
        local_data_path: devLocalPath,
        auto_sync_on_refresh: devAutoSync
      });
      setDevSuccessMessage('Credentials and endpoints saved successfully.');
      setTimeout(() => setDevSuccessMessage(null), 4000);
      const updated = await fetchDeveloperConfig();
      setDevConfig(updated);
      setDevApiKey('');
    } catch (err: any) {
      setDevError(err.message || 'Failed to save configuration');
    } finally {
      setIsSavingDev(false);
    }
  };

  const handleSyncDevTelemetry = async () => {
    setIsSyncingDev(true);
    setDevError(null);
    try {
      const res = await syncDeveloperTelemetry({
        provider: devProvider,
        connection_mode: devConnectionMode,
        endpoint_url: devEndpointUrl,
        api_key: devApiKey || undefined,
        developer_email: devEmail,
        local_data_path: devLocalPath,
        force_refresh: true
      });
      setDevSyncResult(res);
      setDevSuccessMessage(`Synced ${res.metrics?.tool_actions_generated?.toLocaleString()} AI proposals for ${res.developer_email}`);
      setTimeout(() => setDevSuccessMessage(null), 5000);
      if (onConfigSaved) onConfigSaved(subscriptions, laborRates);
    } catch (err: any) {
      setDevError(err.message || 'Failed to sync developer telemetry');
    } finally {
      setIsSyncingDev(false);
    }
  };


  // Teammate Antigravity brain.zip upload state
  const [teammateName, setTeammateName] = useState<string>('');
  const [teammateEmail, setTeammateEmail] = useState<string>('');
  const [teammateDept, setTeammateDept] = useState<string>('Eng & IT');
  const [teammateRole, setTeammateRole] = useState<string>('AI / Software Engineer');
  const [teammateZipFile, setTeammateZipFile] = useState<File | null>(null);
  const [isUploadingTeammate, setIsUploadingTeammate] = useState<boolean>(false);
  const [teammateUploadSuccess, setTeammateUploadSuccess] = useState<string | null>(null);
  const [teammateUploadError, setTeammateUploadError] = useState<string | null>(null);
  const teammateFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadTeammate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teammateZipFile) {
      setTeammateUploadError("Please choose your teammate's brain.zip file.");
      return;
    }
    if (!teammateEmail) {
      setTeammateUploadError("Please provide your teammate's email address.");
      return;
    }
    setIsUploadingTeammate(true);
    setTeammateUploadError(null);
    setTeammateUploadSuccess(null);
    try {
      const res = await uploadTeammateZip(
        teammateZipFile,
        teammateName || 'Teammate Developer',
        teammateEmail,
        teammateDept,
        teammateRole
      );
      setTeammateUploadSuccess(res.message);
      setTeammateName('');
      setTeammateEmail('');
      setTeammateZipFile(null);
      if (teammateFileInputRef.current) teammateFileInputRef.current.value = '';
      if (onThresholdsUpdated) onThresholdsUpdated();
    } catch (err: any) {
      setTeammateUploadError(err.message || 'Failed to ingest teammate zip');
    } finally {
      setIsUploadingTeammate(false);
    }
  };

  // Claude Enterprise API Sync State
  const [claudeConfig, setClaudeConfig] = useState<ClaudeConfig | null>(null);
  const [connectionMode, setConnectionMode] = useState<'live' | 'custom' | 'mock'>('mock');
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [costReportUrl, setCostReportUrl] = useState<string>('');
  const [usageReportUrl, setUsageReportUrl] = useState<string>('');
  const [adminApiKey, setAdminApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showWorkspaces, setShowWorkspaces] = useState<boolean>(false);
  const [autoSyncOnRefresh, setAutoSyncOnRefresh] = useState<boolean>(true);
  const [isSyncingClaude, setIsSyncingClaude] = useState<boolean>(false);
  const [isSavingClaudeConfig, setIsSavingClaudeConfig] = useState<boolean>(false);
  const [claudeSyncResult, setClaudeSyncResult] = useState<ClaudeSyncResponse | null>(null);
  const [claudeSyncError, setClaudeSyncError] = useState<string | null>(null);
  const [claudeConfigSuccess, setClaudeConfigSuccess] = useState<string | null>(null);

  // Load Claude API configuration on mount
  useEffect(() => {
    fetchClaudeConfig()
      .then((cfg) => {
        setClaudeConfig(cfg);
        setConnectionMode(cfg.connection_mode || 'mock');
        setCustomBaseUrl(cfg.custom_base_url || '');
        setOrganizationId(cfg.organization_id || '');
        setCostReportUrl(cfg.cost_report_url || '');
        setUsageReportUrl(cfg.usage_report_url || '');
        setAutoSyncOnRefresh(cfg.auto_sync_on_refresh);
        if (cfg.last_sync_metrics) {
          setClaudeSyncResult({
            status: cfg.last_sync_status || 'success',
            synced_at: cfg.last_synced_at || '',
            source_cost: cfg.last_sync_metrics.source_cost || 'Local Mock',
            source_usage: cfg.last_sync_metrics.source_usage || 'Local Mock',
            agents_synced: cfg.last_sync_metrics.agents_synced || 17,
            metrics: cfg.last_sync_metrics,
            message: 'Loaded previous Claude Enterprise synchronization metrics'
          });
        }
      })
      .catch((err) => console.error('Failed to load Claude config:', err));
  }, []);

  const handleSaveClaudeConfig = async () => {
    setIsSavingClaudeConfig(true);
    setClaudeConfigSuccess(null);
    setClaudeSyncError(null);
    try {
      const res = await updateClaudeConfig({
        connection_mode: connectionMode,
        custom_base_url: customBaseUrl,
        organization_id: organizationId,
        cost_report_url: costReportUrl,
        usage_report_url: usageReportUrl,
        admin_api_key: adminApiKey,
        auto_sync_on_refresh: autoSyncOnRefresh
      });
      setClaudeConfigSuccess(res.message || 'Claude integration configuration saved!');
      const updated = await fetchClaudeConfig();
      setClaudeConfig(updated);
      setAdminApiKey('');
      setTimeout(() => setClaudeConfigSuccess(null), 4000);
    } catch (err: any) {
      setClaudeSyncError(err.message || 'Failed to save configuration');
    } finally {
      setIsSavingClaudeConfig(false);
    }
  };

  const handleSyncClaude = async (forceLocal: boolean = false) => {
    setIsSyncingClaude(true);
    setClaudeSyncError(null);
    try {
      const res = await syncClaudeTelemetry({
        connection_mode: forceLocal ? 'mock' : connectionMode,
        custom_base_url: customBaseUrl,
        cost_report_url: costReportUrl,
        usage_report_url: usageReportUrl,
        admin_api_key: adminApiKey,
        force_local: forceLocal
      });
      setClaudeSyncResult(res);
      onThresholdsUpdated();
      const updated = await fetchClaudeConfig();
      setClaudeConfig(updated);
    } catch (err: any) {
      setClaudeSyncError(err.message || 'Claude synchronization failed');
    } finally {
      setIsSyncingClaude(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Data Ingestion State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ingestSummary, setIngestSummary] = useState<IngestSummary | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (file: File) => {
    const validExts = ['.csv', '.xlsx', '.xls'];
    const hasValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setUploadError('Invalid file format. Please select a .csv or .xlsx spreadsheet.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB maximum limit.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
    setIngestSummary(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await uploadTelemetryFile(selectedFile);
      setIngestSummary(res.summary);
      onThresholdsUpdated(); // Live re-hydrates all tabs in App.tsx!
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process and ingest telemetry file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadCsvTemplate();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to download template.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const isLight = theme === 'light';

  // Real-time valuation calculations based on tuned parameters
  // Average blended rate weighted across typical enterprise estate (Eng 40%, Ops 30%, Finance 15%, Sales 15%)
  const blendedHourlyRate = (
    laborRates.engineering * 0.40 +
    laborRates.operations * 0.30 +
    laborRates.finance * 0.15 +
    laborRates.sales * 0.15
  );

  // Live portfolio valuation dynamically connected to actual database summary
  const dynamicTotalCost = summary?.total_cost || 0;
  const baselineHoursSaved = summary?.total_hours_saved || 0;
  const simulatedGrossValue = Math.round(baselineHoursSaved * blendedHourlyRate);
  const simulatedNetValue = Math.round(simulatedGrossValue - dynamicTotalCost);
  const simulatedRoiMultiplier = dynamicTotalCost > 0 ? Number((simulatedGrossValue / dynamicTotalCost).toFixed(2)) : 0;
  const simulatedFtesUnlocked = Math.round(baselineHoursSaved / (laborRates.monthlyFteHours || 160));

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('wct_subscription_config', JSON.stringify(subscriptions));
      localStorage.setItem('wct_labor_config', JSON.stringify(laborRates));
      localStorage.setItem('wct_guardrail_config', JSON.stringify(guardrails));

      if (updateThresholds) {
        await updateThresholds(thresholds).catch(() => {});
      }
      if (onConfigSaved) {
        onConfigSaved(subscriptions, laborRates);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onThresholdsUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSubscriptions(DEFAULT_SUBSCRIPTION_CONFIG);
    setLaborRates(DEFAULT_LABOR_CONFIG);
    setGuardrails(DEFAULT_GUARDRAIL_CONFIG);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!isAdmin && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 10,
          background: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.12)',
          border: `1.5px solid ${isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.35)'}`,
          color: isLight ? '#92400E' : '#FDE68A',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: isLight ? '0 2px 8px rgba(217, 119, 6, 0.08)' : 'none'
        }}>
          <Lock size={22} color={isLight ? '#D97706' : '#F59E0B'} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <strong style={{ display: 'block', fontSize: 13.5, marginBottom: 2 }}>
              Read-Only Governance Mode (Restricted by RBAC)
            </strong>
            You are currently signed in as <strong>{user?.display_name || 'Non-Admin'}</strong> ({user?.role?.toUpperCase()}). 
            You have read access to view enterprise valuation assumptions, but modifying subscription pricing, hourly wage models, and governance guardrails requires <strong>Cockpit Administrator</strong> privileges.
          </div>
        </div>
      )}
      {/* Top Header Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #D6E2FA',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 4px 16px rgba(0, 52, 155, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #00349B 0%, #1713FD 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                Enterprise AI Subscription &amp; Valuation Configurator
              </h2>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                Configure seat subscription models, functional labor valuation rates, FinOps overage guardrails, and governance thresholds.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleResetDefaults}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: 20,
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving || !isAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#00349B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 20,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 52, 155, 0.25)'
            }}
          >
            {isAdmin ? <Save size={15} /> : <Lock size={15} />} {isSaving ? 'Saving...' : isAdmin ? 'Save & Recalculate Portfolio' : 'Admin Authority Required'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '12px 18px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 700
        }}>
          <Check size={18} color="#059669" />
          <span>Configuration saved successfully! All valuation models and governance action states have been recalculated.</span>
        </div>
      )}

      {/* Real-time Valuation Sandbox Impact Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0A2540 0%, #00349B 100%)',
        borderRadius: 12,
        padding: '20px 24px',
        color: '#FFFFFF',
        boxShadow: '0 8px 24px -4px rgba(0, 52, 155, 0.28)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #38BDF8, #818CF8)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#38BDF8" />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#93C5FD' }}>
              Live Portfolio Valuation Impact Sandbox
            </span>
          </div>
          <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.15)', padding: '3px 9px', borderRadius: 12, fontWeight: 700 }}>
            Dynamic Projection
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              Blended Labor Rate
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              ${blendedHourlyRate.toFixed(2)} <span style={{ fontSize: 13, fontWeight: 500, color: '#CBD5E1' }}>/ hr</span>
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Weighted across all active functions
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              Gross Value ({Math.round(baselineHoursSaved).toLocaleString()} hrs)
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              {formatUSD(simulatedGrossValue)}
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Hours Saved × Blended Wage
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              Net AI Value
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#6EE7B7', fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              {formatUSD(simulatedNetValue)}
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Gross Value - {formatUSD(dynamicTotalCost)} Cost
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              ROI Multiplier
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#FCD34D', fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              {simulatedRoiMultiplier.toFixed(2)}x
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Return per $1.00 spent
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              Labor Capacity Unlocked
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              ~{simulatedFtesUnlocked.toFixed(0)} FTEs
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Based on {laborRates.monthlyFteHours}h / month
            </div>
          </div>
        </div>
      </div>

      {/* Section Selector Pills */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1.5px solid #E2E8F0',
        paddingBottom: 4
      }}>
        <button
          onClick={() => setActiveSection('subs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'subs' ? '#00349B' : 'transparent',
            color: activeSection === 'subs' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <CreditCard size={15} /> AI Subscriptions &amp; Licenses
        </button>

        <button
          onClick={() => setActiveSection('labor')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'labor' ? '#00349B' : 'transparent',
            color: activeSection === 'labor' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Briefcase size={15} /> Labor Rates &amp; Productivity
        </button>

        <button
          onClick={() => setActiveSection('guardrails')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'guardrails' ? '#00349B' : 'transparent',
            color: activeSection === 'guardrails' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <ShieldAlert size={15} /> FinOps Quotas &amp; Guardrails
        </button>

        <button
          onClick={() => setActiveSection('governance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'governance' ? '#00349B' : 'transparent',
            color: activeSection === 'governance' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Zap size={15} /> Governance Action Rules
        </button>

        <button
          onClick={() => setActiveSection('ingestion')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'ingestion' ? '#00349B' : 'transparent',
            color: activeSection === 'ingestion' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <UploadCloud size={15} /> Telemetry Ingestion (CSV / Excel)
        </button>

        <button
          onClick={() => setActiveSection('developer_tools')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'developer_tools' ? '#0284C7' : 'transparent',
            color: activeSection === 'developer_tools' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Code size={15} /> Developer AI Tools
          <span style={{
            background: activeSection === 'developer_tools' ? '#BAE6FD' : '#E0F2FE',
            color: activeSection === 'developer_tools' ? '#0369A1' : '#0284C7',
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 10,
            marginLeft: 2
          }}>
            GEMINI / COPILOT
          </span>
        </button>

        <button
          onClick={() => setActiveSection('working_agents')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'working_agents' ? '#4F46E5' : 'transparent',
            color: activeSection === 'working_agents' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Bot size={15} /> Working Agents Onboarding
          <span style={{
            background: activeSection === 'working_agents' ? '#E0E7FF' : '#EEF2FF',
            color: activeSection === 'working_agents' ? '#3730A3' : '#4F46E5',
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 10,
            marginLeft: 2
          }}>
            REGISTRY
          </span>
        </button>
      </div>

      {/* SECTION 1: AI SUBSCRIPTIONS & LICENSES */}
      {activeSection === 'subs' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B' }}>
              Seat License Unit Pricing &amp; Token Metering
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
              Define default baseline unit prices used by the FinOps seat reclaim engine and consumption models.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}>
            {/* Sub 1: Microsoft 365 Copilot */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>M365 Copilot License</span>
                <span style={{ fontSize: 10, background: '#EFF6FF', color: '#00349B', padding: '2px 6px', borderRadius: 4 }}>Seat-Based</span>
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 12px 0' }}>
                Fixed monthly license cost per active directory seat. Standard commercial pricing: $30/user/mo.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="1"
                  value={subscriptions.m365CopilotPrice}
                  onChange={e => setSubscriptions({ ...subscriptions, m365CopilotPrice: +e.target.value })}
                  style={{
                    width: 100,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>per user / month</span>
              </div>
            </div>

            {/* Sub 2: Copilot Studio Message Packs */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Copilot Studio Capacity Pack</span>
                <span style={{ fontSize: 10, background: '#F3E8FF', color: '#7E22CE', padding: '2px 6px', borderRadius: 4 }}>Hybrid Quota</span>
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 12px 0' }}>
                Tenant subscription for autonomous studio agents. Standard: $200/mo includes 25,000 billed messages.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="10"
                  value={subscriptions.copilotStudioPackPrice}
                  onChange={e => setSubscriptions({ ...subscriptions, copilotStudioPackPrice: +e.target.value })}
                  style={{
                    width: 100,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>/ month (25K msgs)</span>
              </div>
            </div>

            {/* Sub 3: GitHub Copilot Enterprise */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>GitHub Copilot Developer Seat</span>
                <span style={{ fontSize: 10, background: '#ECFDF5', color: '#059669', padding: '2px 6px', borderRadius: 4 }}>Dev Seat</span>
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 12px 0' }}>
                Software engineering seat tier for developer productivity and pull request assistance.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="1"
                  value={subscriptions.githubCopilotPrice}
                  onChange={e => setSubscriptions({ ...subscriptions, githubCopilotPrice: +e.target.value })}
                  style={{
                    width: 100,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>per developer / month</span>
              </div>
            </div>

            {/* Sub 4: Custom Agent Token API Pricing */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>LLM Token API Meter (PAYG)</span>
                <span style={{ fontSize: 10, background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: 4 }}>Consumption</span>
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 12px 0' }}>
                Blended input/output token pricing per 1 Million tokens (Azure OpenAI GPT-4o / Claude 3.5 Sonnet).
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="0.5"
                  value={subscriptions.outputTokenPricePerMillion}
                  onChange={e => setSubscriptions({ ...subscriptions, outputTokenPricePerMillion: +e.target.value })}
                  style={{
                    width: 100,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>per 1M output tokens</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LABOR RATES & PRODUCTIVITY */}
      {activeSection === 'labor' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B' }}>
              Functional Blended Wage Rates &amp; FTE Working Hours
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
              Calibrate the hourly cost of labor by business function. Gross AI Value is computed as: <b>Hours Saved × Blended Wage Rate</b>.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16
          }}>
            {/* Rate 1: Software Engineering */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                Software Engineering &amp; IT
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Full-stack engineers, DevOps, and cloud architects.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="5"
                  value={laborRates.engineering}
                  onChange={e => setLaborRates({ ...laborRates, engineering: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>USD / hour</span>
              </div>
            </div>

            {/* Rate 2: Finance & Accounting */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                Finance &amp; Corporate Accounting
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                FP&amp;A analysts, tax controllers, and treasury teams.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="5"
                  value={laborRates.finance}
                  onChange={e => setLaborRates({ ...laborRates, finance: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>USD / hour</span>
              </div>
            </div>

            {/* Rate 3: Operations & Supply Chain */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                Business Operations &amp; Supply Chain
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Procurement officers, warehouse logistics, and invoice triage.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="5"
                  value={laborRates.operations}
                  onChange={e => setLaborRates({ ...laborRates, operations: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>USD / hour</span>
              </div>
            </div>

            {/* Rate 4: Clinical & Healthcare Operations */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                Clinical &amp; Healthcare Operations
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Clinical research associates, trial coordinators, and medical scribes.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="5"
                  value={laborRates.clinical}
                  onChange={e => setLaborRates({ ...laborRates, clinical: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>USD / hour</span>
              </div>
            </div>

            {/* Rate 5: Monthly Working Hours per FTE */}
            <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#00349B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} />
                <span>Monthly Working Hours / FTE</span>
              </label>
              <p style={{ fontSize: 12, color: '#1E40AF', margin: '4px 0 10px 0' }}>
                Benchmark hours per full-time employee used to convert hours saved into FTE capacity unlocked.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  step="5"
                  value={laborRates.monthlyFteHours}
                  onChange={e => setLaborRates({ ...laborRates, monthlyFteHours: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #93C5FD', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#1E40AF', fontWeight: 600 }}>hours / FTE / month (std: 160h)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: FINOPS QUOTAS & GUARDRAILS */}
      {activeSection === 'guardrails' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B' }}>
              FinOps Inactivity Cutoffs &amp; Quota Alerting
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
              Govern seat inactivity categorization and alert thresholds for proactive license harvesting.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}>
            {/* Guardrail 1: Idle Seat Inactivity Cutoff */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#B45309' }}>
                Idle Seat Inactivity Threshold
              </label>
              <p style={{ fontSize: 12, color: '#92400E', margin: '4px 0 10px 0' }}>
                Seats with zero telemetry for this duration are classified as idle and targeted for automatic reclaim.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={guardrails.idleSeatDays}
                  onChange={e => setGuardrails({ ...guardrails, idleSeatDays: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #FCD34D', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#92400E', fontWeight: 600 }}>days without activity (std: 30d)</span>
              </div>
            </div>

            {/* Guardrail 2: Lapsing Window */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#475569' }}>
                Lapsing Seat Coaching Window
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Users inactive between these day limits receive automated prompt engineering and coaching nudges.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={guardrails.lapsingWindowMinDays}
                  onChange={e => setGuardrails({ ...guardrails, lapsingWindowMinDays: +e.target.value })}
                  style={{ width: 65, padding: '8px 10px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>to</span>
                <input
                  type="number"
                  value={guardrails.lapsingWindowMaxDays}
                  onChange={e => setGuardrails({ ...guardrails, lapsingWindowMaxDays: +e.target.value })}
                  style={{ width: 65, padding: '8px 10px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>days</span>
              </div>
            </div>

            {/* Guardrail 3: Token Quota Warning Alert */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>
                Token Quota Consumption Alert (%)
              </label>
              <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 10px 0' }}>
                Trigger FinOps notification when monthly token consumption exceeds this percentage of allocated quota.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={guardrails.tokenQuotaAlertPct}
                  onChange={e => setGuardrails({ ...guardrails, tokenQuotaAlertPct: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #F87171', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 600 }}>% of monthly quota (std: 90%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: GOVERNANCE ACTION RULES */}
      {activeSection === 'governance' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B' }}>
              Portfolio Governance & Action Thresholds
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
              Automated triggers that classify enterprise agents into <b>Accelerate</b>, <b>Optimize</b>, <b>Intervene</b>, or <b>Experiment</b>.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}>
            {/* Rule 1: Experiment Cutoff */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#475569' }}>
                1. EXPERIMENT: Production Age Cutoff
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Agents younger than this threshold are categorized as early pilot experiments regardless of financial ROI.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={thresholds.experiment_days}
                  onChange={e => setThresholds({ ...thresholds, experiment_days: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>days in production (std: 60)</span>
              </div>
            </div>

            {/* Rule 2: Intervene Eval Pass */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>
                2. INTERVENE: Minimum Eval Pass Rate
              </label>
              <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 10px 0' }}>
                Trigger quality containment if automated evaluation pass rate drops below this bar.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={thresholds.intervene_eval_pass}
                  onChange={e => setThresholds({ ...thresholds, intervene_eval_pass: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #F87171', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 600 }}>% accuracy SLA (std: 88%)</span>
              </div>
            </div>

            {/* Rule 3: Intervene Budget Overage */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>
                3. INTERVENE: Cost-to-Budget Ratio
              </label>
              <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 10px 0' }}>
                Trigger FinOps budget containment if actual expenditure exceeds plan.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={thresholds.intervene_cost_budget_pct}
                  onChange={e => setThresholds({ ...thresholds, intervene_cost_budget_pct: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #F87171', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 600 }}>% of budget cap (std: 110%)</span>
              </div>
            </div>

            {/* Rule 4: Accelerate Value Floor */}
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                4. ACCELERATE: Net Value Floor
              </label>
              <p style={{ fontSize: 12, color: '#065F46', margin: '4px 0 10px 0' }}>
                Minimum monthly net value required to qualify for enterprise-wide scale-out.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>$</span>
                <input
                  type="number"
                  step="5000"
                  value={thresholds.accelerate_value_min}
                  onChange={e => setThresholds({ ...thresholds, accelerate_value_min: +e.target.value })}
                  style={{ width: 100, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #6EE7B7', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#065F46', fontWeight: 600 }}>USD / mo (std: $40K)</span>
              </div>
            </div>

            {/* Rule 5: Accelerate Adoption Floor */}
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                5. ACCELERATE: Minimum Adoption Rate
              </label>
              <p style={{ fontSize: 12, color: '#065F46', margin: '4px 0 10px 0' }}>
                Minimum team user adoption rate required to qualify for executive acceleration.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={thresholds.accelerate_adoption_min}
                  onChange={e => setThresholds({ ...thresholds, accelerate_adoption_min: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #6EE7B7', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#065F46', fontWeight: 600 }}>% adoption (std: 70%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: DATA INGESTION (CSV / EXCEL) */}
      {activeSection === 'ingestion' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          {/* Header & Template Download Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            borderBottom: '1.5px solid #EEF2F6',
            paddingBottom: 16
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #00349B 0%, #0066CC 100%)',
                  color: '#FFFFFF',
                  padding: 8,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#00349B' }}>
                    Enterprise Telemetry &amp; Usage Ingestion Gateway
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
                    Ingest raw batch runs or employee execution logs (.csv, .xlsx) to dynamically calculate hours saved, gross value, and portfolio ROI.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#F0F7FF',
                border: '1.5px solid #BAE6FD',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                color: '#0284C7',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.1)'
              }}
            >
              <Download size={15} />
              {isDownloadingTemplate ? 'Downloading...' : 'Download Sample CSV Template'}
            </button>
          </div>

          {/* Error Banner */}
          {uploadError && (
            <div style={{
              background: '#FEF2F2',
              border: '1.5px solid #FECACA',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#991B1B',
              fontSize: 13,
              fontWeight: 600
            }}>
              <AlertCircle size={18} color="#DC2626" />
              <div style={{ flex: 1 }}>{uploadError}</div>
              <button
                onClick={() => setUploadError(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#991B1B' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Interactive Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragging ? '2px dashed #00349B' : '2px dashed #CBD5E1',
              background: isDragging ? '#EFF6FF' : '#F8FAFC',
              borderRadius: 12,
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              style={{ display: 'none' }}
            />

            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: isDragging ? '#DBEAFE' : '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              color: isDragging ? '#00349B' : '#475569'
            }}>
              <FileSpreadsheet size={28} />
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
              Drag &amp; drop your telemetry file here, or <span style={{ color: '#00349B', textDecoration: 'underline' }}>browse</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
              Supported formats: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> &bull; Maximum file size: 15 MB
            </div>
          </div>

          {/* Selected File Details & Upload Action */}
          {selectedFile && (
            <div style={{
              background: '#F1F5F9',
              border: '1.5px solid #CBD5E1',
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: '#00349B',
                  color: '#FFFFFF',
                  padding: 8,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready for parsing &amp; recalculation
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadError(null);
                  }}
                  disabled={isUploading}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    padding: '8px 14px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#00349B',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 52, 155, 0.25)'
                  }}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      Parsing &amp; Computing...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} />
                      Ingest &amp; Recalculate Portfolio
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success Summary Impact Card */}
          {ingestSummary && (
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#166534' }}>
                  Telemetry Ingested Successfully &bull; Cockpit Portfolio Re-hydrated
                </h4>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                background: '#FFFFFF',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #BBF7D0'
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Rows Ingested
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {ingestSummary.rows_processed}
                  </div>
                  <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>Parsed cleanly</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Agents Updated
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#00349B', marginTop: 2 }}>
                    {ingestSummary.agents_updated.length}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Portfolio targets</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Tasks Completed
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {ingestSummary.total_tasks_completed.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>AI executions</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Hours Saved
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                    {ingestSummary.hours_saved.toLocaleString()}h
                  </div>
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Role-weighted avg</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Gross Value
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#00349B', marginTop: 2 }}>
                    {formatUSD(ingestSummary.gross_value_usd)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Labor capacity</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Net Value &amp; ROI
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', marginTop: 2 }}>
                    {formatUSD(ingestSummary.net_value_usd)}
                  </div>
                  <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>
                    {ingestSummary.roi_ratio > 0 ? `${ingestSummary.roi_ratio.toFixed(1)}x ROI` : 'Positive'}
                  </div>
                </div>
              </div>

              {ingestSummary.agents_updated.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                    Updated Agents in Portfolio:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ingestSummary.agents_updated.map((name, i) => (
                      <span
                        key={i}
                        style={{
                          background: '#DCFCE7',
                          border: '1px solid #86EFAC',
                          color: '#15803D',
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 20
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 7: DEVELOPER AI TOOLS INTEGRATION (Gemini & GitHub Copilot) */}
      {activeSection === 'developer_tools' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #BAE6FD',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(2, 132, 199, 0.06)'
        }}>
          {/* Header Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E0F2FE',
            paddingBottom: 16,
            marginBottom: 20
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  borderRadius: 8,
                  padding: '7px 9px',
                  color: '#FFFFFF'
                }}>
                  <Code size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0C4A6E', fontFamily: 'Figtree, sans-serif' }}>
                    Developer AI Tools Telemetry & Seat Pipeline
                  </h3>
                  <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                    Connect to Google Gemini (Antigravity IDE & Code Assist) or GitHub Copilot API to harvest real developer activity.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: devSyncResult ? '#ECFDF5' : '#F8FAFC',
                border: devSyncResult ? '1.5px solid #A7F3D0' : '1.5px solid #CBD5E1',
                color: devSyncResult ? '#065F46' : '#64748B'
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: devSyncResult ? '#10B981' : '#94A3B8',
                  display: 'inline-block'
                }} />
                {devSyncResult ? 'CONNECTED & TELEMETRY LIVE' : 'AWAITING SYNC'}
              </div>

              <button
                onClick={handleSyncDevTelemetry}
                disabled={isSyncingDev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 7,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isSyncingDev ? 'not-allowed' : 'pointer',
                  opacity: isSyncingDev ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.2)'
                }}
              >
                <RefreshCw size={14} className={isSyncingDev ? 'spin' : ''} />
                {isSyncingDev ? 'Ingesting Developer Activity...' : 'Sync Telemetry Now'}
              </button>
            </div>
          </div>

          {/* Provider Selection Tabs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => {
                setDevProvider('gemini_antigravity');
                setDevEndpointUrl('https://generativelanguage.googleapis.com');
                setDevConnectionMode('live_api');
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 10,
                border: devProvider === 'gemini_antigravity' ? '2px solid #0284C7' : '1.5px solid #E2E8F0',
                background: devProvider === 'gemini_antigravity' ? '#F0F9FF' : '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{
                background: devProvider === 'gemini_antigravity' ? '#0284C7' : '#F1F5F9',
                color: devProvider === 'gemini_antigravity' ? '#FFFFFF' : '#64748B',
                borderRadius: 8,
                padding: 10
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: devProvider === 'gemini_antigravity' ? '#0369A1' : '#1E293B' }}>
                  Antigravity IDE
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Local IDE workspace trajectories, prompts, tool execution & telemetry
                </div>
              </div>
              {devProvider === 'gemini_antigravity' && (
                <CheckCircle2 size={18} color="#0284C7" style={{ marginLeft: 'auto' }} />
              )}
            </button>

            <button
              onClick={() => {
                setDevProvider('github_copilot');
                setDevEndpointUrl('https://api.github.com');
                setDevConnectionMode('live_api');
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 10,
                border: devProvider === 'github_copilot' ? '2px solid #24292F' : '1.5px solid #E2E8F0',
                background: devProvider === 'github_copilot' ? '#F6F8FA' : '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{
                background: devProvider === 'github_copilot' ? '#24292F' : '#F1F5F9',
                color: devProvider === 'github_copilot' ? '#FFFFFF' : '#64748B',
                borderRadius: 8,
                padding: 10
              }}>
                <Cpu size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: devProvider === 'github_copilot' ? '#24292F' : '#1E293B' }}>
                  GitHub Copilot Enterprise
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  GitHub Organization Seats, Activity & Telemetry API
                </div>
              </div>
              {devProvider === 'github_copilot' && (
                <CheckCircle2 size={18} color="#24292F" style={{ marginLeft: 'auto' }} />
              )}
            </button>
          </div>

          {/* Feedback messages */}
          {devError && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#991B1B',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{devError}</span>
            </div>
          )}

          {devSuccessMessage && (
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#166534',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle2 size={16} />
              <span>{devSuccessMessage}</span>
            </div>
          )}

          {devTestResult && (
            <div style={{
              background: devTestResult.connected ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${devTestResult.connected ? '#86EFAC' : '#FCD34D'}`,
              borderRadius: 8,
              padding: '12px 16px',
              color: devTestResult.connected ? '#166534' : '#92400E',
              fontSize: 13,
              marginBottom: 16
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {devTestResult.connected ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {devTestResult.connected ? 'Connection Verified Successfully' : 'Connection Warning'}
              </div>
              <div>{devTestResult.message}</div>
              {devTestResult.sample_models && (
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Active Models: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{devTestResult.sample_models.join(', ')}</span>
                </div>
              )}
            </div>
          )}


                    {/* ACCORDION 1: ENTERPRISE ORGANIZATION & API CREDENTIALS */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 10,
            marginBottom: 16,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <button
              onClick={() => toggleAccordion('api_creds')}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: openAccordions.api_creds ? '#F8FAFC' : '#FFFFFF',
                border: 'none',
                borderBottom: openAccordions.api_creds ? '1px solid #E2E8F0' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: devProvider === 'github_copilot' ? '#24292F' : '#0284C7',
                  color: '#FFFFFF',
                  padding: '6px 8px',
                  borderRadius: 6
                }}>
                  <Key size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', fontFamily: 'Figtree, sans-serif' }}>
                    {devProvider === 'github_copilot' ? 'GitHub Copilot Enterprise API Suite & Organization Credentials' : 'Google Gemini & Antigravity Enterprise API Credentials'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                    {devProvider === 'github_copilot' 
                      ? 'Harvest organization-wide seat allocations, editor usage (VS Code/JetBrains), and code acceptance rates.'
                      : 'Connect to Google AI Studio, Vertex AI, or local Antigravity IDE workspace streams.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: devProvider === 'github_copilot' ? '#F6F8FA' : '#F0F9FF',
                  border: devProvider === 'github_copilot' ? '1px solid #D0D7DE' : '1px solid #BAE6FD',
                  color: devProvider === 'github_copilot' ? '#24292F' : '#0369A1',
                  padding: '3px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  {devProvider === 'github_copilot' ? 'GITHUB REST API v2022-11-28' : 'GEMINI API v1beta'}
                </span>
                {openAccordions.api_creds ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
              </div>
            </button>

            {openAccordions.api_creds && (
              <div style={{ padding: 20, background: '#FFFFFF' }}>
                <div style={{
                  background: devProvider === 'github_copilot' ? '#F6F8FA' : '#F0F9FF',
                  border: devProvider === 'github_copilot' ? '1px solid #E1E4E8' : '1px solid #BAE6FD',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 12,
                  color: '#334155',
                  marginBottom: 16
                }}>
                  <strong>Target Enterprise API Endpoints Harvested:</strong>
                  {devProvider === 'github_copilot' ? (
                    <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#24292F', marginTop: 4 }}>
                      • <code>GET /orgs/&#123;org&#125;/copilot/billing/seats</code> → Active licenses, assignee logins, last activity, editor version<br/>
                      • <code>GET /orgs/&#123;org&#125;/copilot/usage</code> → Daily completions, suggestions accepted, lines accepted
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#0369A1', marginTop: 4 }}>
                      • <code>POST /v1beta/models/gemini-2.5-pro:generateContent</code> → Live developer chat & prompt executions<br/>
                      • <code>Antigravity IDE Local Storage</code> → Trajectories, code edits, and hours saved
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {/* Org / Project ID */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      {devProvider === 'github_copilot' ? 'GitHub Organization / Enterprise Slug' : 'Google Cloud Project / Org ID'}
                    </label>
                    <input
                      type="text"
                      value={devOrgId}
                      onChange={(e) => setDevOrgId(e.target.value)}
                      placeholder={devProvider === 'github_copilot' ? 'e.g. waferwire or your-org-name' : 'e.g. prj-ai-cockpit-prod'}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                      {devProvider === 'github_copilot' ? 'Your GitHub organization name used in the API route /orgs/{org}' : 'Google Cloud Project ID associated with Gemini API'}
                    </div>
                  </div>

                  {/* API Key / Token */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      {devProvider === 'github_copilot' ? 'GitHub Admin Personal Access Token (PAT)' : 'Google Gemini API Key'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showDevApiKey ? 'text' : 'password'}
                        value={devApiKey}
                        onChange={(e) => setDevApiKey(e.target.value)}
                        placeholder={devConfig?.has_api_key ? `Saved (${devConfig.api_key_masked})` : (devProvider === 'gemini_antigravity' ? 'AIzaSy...' : 'ghp_...')}
                        style={{
                          width: '100%',
                          padding: '9px 40px 9px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDevApiKey(!showDevApiKey)}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B'
                        }}
                      >
                        {showDevApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                      {devProvider === 'github_copilot' ? 'Requires "manage_billing:copilot" and "read:org" scopes' : 'Google AI Studio API key or Vertex AI service account credential'}
                    </div>
                  </div>

                  {/* Endpoint URL */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      API Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={devEndpointUrl}
                      onChange={(e) => setDevEndpointUrl(e.target.value)}
                      placeholder={devProvider === 'gemini_antigravity' ? 'https://generativelanguage.googleapis.com' : 'https://api.github.com'}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                      {devProvider === 'github_copilot' ? 'Default: https://api.github.com (or GitHub Enterprise Server URL)' : 'Default: https://generativelanguage.googleapis.com'}
                    </div>
                  </div>

                  {/* Telemetry Scope */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      Telemetry Ingestion Scope
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        background: '#FFFFFF'
                      }}
                    >
                      <option value="full">Full Enterprise Suite: Seat Billing, IDE Suggestion Acceptance & Usage</option>
                      <option value="seats">Billing Seats Only (/orgs/&#123;org&#125;/copilot/billing/seats)</option>
                      <option value="usage">Aggregated Activity Metrics (/orgs/&#123;org&#125;/copilot/usage)</option>
                    </select>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                      Specifies data streams queried from the provider
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button
                    onClick={handleTestDevConnection}
                    disabled={isTestingDev}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 6,
                      border: '1px solid #0284C7',
                      background: '#FFFFFF',
                      color: '#0284C7',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isTestingDev ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Server size={14} />
                    {isTestingDev ? 'Testing Connection...' : (devProvider === 'github_copilot' ? 'Test GitHub Connection & Verify Seats' : 'Test Gemini Connection')}
                  </button>

                  <button
                    onClick={handleSaveDevConfig}
                    disabled={isSavingDev}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isSavingDev ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Save size={14} />
                    {isSavingDev ? 'Saving...' : 'Save API Credentials'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 2: IMPORT TEAMMATE ANTIGRAVITY LOGS (BRAIN.ZIP) - Antigravity IDE Only */}
          {devProvider === 'gemini_antigravity' && (

          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #BAE6FD',
            borderRadius: 10,
            marginBottom: 16,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)'
          }}>
            <button
              onClick={() => toggleAccordion('teammate_import')}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: openAccordions.teammate_import ? '#F0F9FF' : '#FFFFFF',
                border: 'none',
                borderBottom: openAccordions.teammate_import ? '1px solid #BAE6FD' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#0284C7', color: '#FFFFFF', padding: '6px 8px', borderRadius: 6 }}>
                  <UploadCloud size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0C4A6E', fontFamily: 'Figtree, sans-serif' }}>
                    Import Teammate Antigravity Logs (`brain.zip`)
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
                    Upload compressed <code>brain.zip</code> archives from remote developers to parse sessions, prompts, and hours saved.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: '#E0F2FE',
                  border: '1px solid #BAE6FD',
                  color: '#0369A1',
                  padding: '3px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  ARCHIVE INGESTION
                </span>
                {openAccordions.teammate_import ? <ChevronUp size={18} color="#0369A1" /> : <ChevronDown size={18} color="#64748B" />}
              </div>
            </button>

            {openAccordions.teammate_import && (
              <div style={{ padding: 20, background: '#F8FAFC' }}>
                {teammateUploadError && (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 6,
                    padding: '10px 14px',
                    color: '#991B1B',
                    fontSize: 13,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <AlertCircle size={16} />
                    <span>{teammateUploadError}</span>
                  </div>
                )}

                {teammateUploadSuccess && (
                  <div style={{
                    background: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: 6,
                    padding: '10px 14px',
                    color: '#166534',
                    fontSize: 13,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <CheckCircle2 size={16} />
                    <span>{teammateUploadSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleUploadTeammate}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Teammate Full Name
                      </label>
                      <input
                        type="text"
                        value={teammateName}
                        onChange={(e) => setTeammateName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Teammate Work / Antigravity Email
                      </label>
                      <input
                        type="email"
                        value={teammateEmail}
                        onChange={(e) => setTeammateEmail(e.target.value)}
                        placeholder="e.g. rahul@waferwire.com"
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Department
                      </label>
                      <select
                        value={teammateDept}
                        onChange={(e) => setTeammateDept(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          background: '#FFFFFF'
                        }}
                      >
                        <option value="Eng & IT">Engineering & IT</option>
                        <option value="Product & Design">Product & Design</option>
                        <option value="Data & AI">Data & AI</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Select `brain.zip` File
                      </label>
                      <input
                        type="file"
                        ref={teammateFileInputRef}
                        accept=".zip"
                        required
                        onChange={(e) => setTeammateZipFile(e.target.files?.[0] || null)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 12,
                          background: '#FFFFFF'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploadingTeammate}
                    style={{
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      padding: '9px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isUploadingTeammate ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.2)'
                    }}
                  >
                    <UploadCloud size={15} />
                    {isUploadingTeammate ? 'Ingesting Teammate Logs...' : 'Ingest & Register Teammate Seat'}
                  </button>
                </form>
              </div>
            )}
          </div>
          )}

          {/* ACCORDION 4: MICROSOFT 365 COPILOT ESTATE & DATA MANAGEMENT */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #BAE6FD',
            borderRadius: 10,
            marginBottom: 16,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)'
          }}>
            <button
              onClick={() => toggleAccordion('m365_admin')}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: openAccordions.m365_admin ? '#F0F9FF' : '#FFFFFF',
                border: 'none',
                borderBottom: openAccordions.m365_admin ? '1px solid #BAE6FD' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#0284C7', color: '#FFFFFF', padding: '6px 8px', borderRadius: 6 }}>
                  <Layers size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0C4A6E', fontFamily: 'Figtree, sans-serif' }}>
                    Microsoft 365 Copilot Subscriptions & Seat Ingestion Pipeline
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
                    Ingest usage reports, configure Azure AD Graph API connectivity, and manage seat telemetry records.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: (adminM365Data?.total_seats ?? 0) > 0 ? '#ECFDF5' : '#F1F5F9',
                  border: (adminM365Data?.total_seats ?? 0) > 0 ? '1px solid #A7F3D0' : '1px solid #CBD5E1',
                  color: (adminM365Data?.total_seats ?? 0) > 0 ? '#065F46' : '#64748B',
                  padding: '3px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  {(adminM365Data?.total_seats ?? 0) > 0 ? `${adminM365Data?.total_seats} SEATS INGESTED` : '0 SEATS INGESTED'}
                </span>
                {openAccordions.m365_admin ? <ChevronUp size={18} color="#0369A1" /> : <ChevronDown size={18} color="#64748B" />}
              </div>
            </button>

            {openAccordions.m365_admin && (
              <div style={{ padding: 20, background: '#FFFFFF' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '14px 18px',
                  marginBottom: 16
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      Current Ingested M365 Data Status
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Total Seats: <strong>{adminM365Data?.total_seats ?? 0}</strong> | Active: <strong>{adminM365Data?.active_seats ?? 0}</strong> | Total Prompts: <strong>{adminM365Data?.total_prompts?.toLocaleString() ?? 0}</strong> | Hours Saved: <strong>{adminM365Data?.total_hours_saved ?? 0}h</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      ref={adminM365FileInputRef}
                      onChange={handleAdminM365Upload}
                      accept=".csv, .xlsx, .xls"
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => adminM365FileInputRef.current?.click()}
                      disabled={isUploadingAdminM365}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isUploadingAdminM365 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <UploadCloud size={14} />
                      {isUploadingAdminM365 ? 'Ingesting...' : 'Upload M365 Copilot (CSV / Excel)'}
                    </button>

                    {(adminM365Data?.total_seats ?? 0) > 0 && (
                      <button
                        onClick={() => setShowAdminM365ClearModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                        Clear M365 Records
                      </button>
                    )}
                  </div>
                </div>

                {/* Azure AD Direct Graph API Settings */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                    Direct Azure AD Microsoft Graph API Sync (Automated Telemetry Polling)
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                    Harvest <code>https://graph.microsoft.com/v1.0/reports/getMicrosoft365CopilotUsageUserDetail(period='D28')</code> automatically without manual CSV exports.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        Azure AD Tenant ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 72f988bf-86f1-41af-91ab-2d7cd011db47"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        Azure App Client ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        Azure App Client Secret
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••••••••••••••••"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <button
                      onClick={() => {
                        setDevSuccessMessage('Azure AD credentials saved. Ready for automated Microsoft Graph API polling.');
                        setTimeout(() => setDevSuccessMessage(null), 5000);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#0284C7',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Save Azure AD Credentials
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ADMIN M365 CLEAR CONFIRMATION MODAL */}
          {showAdminM365ClearModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: 20
            }}>
              <div style={{
                background: '#FFFFFF',
                borderRadius: 14,
                maxWidth: 440,
                width: '100%',
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                border: '1.5px solid #FCA5A5',
                fontFamily: 'Figtree, sans-serif'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ background: '#FEE2E2', color: '#DC2626', padding: 10, borderRadius: 10 }}>
                    <Trash2 size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#991B1B' }}>
                      Clear All M365 Copilot Records?
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Database reset action
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                  Are you sure you want to delete all <strong>{adminM365Data?.total_seats ?? 0} employee records</strong> from the Cockpit database? 
                  You can upload a new CSV report or re-sync at any time.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => setShowAdminM365ClearModal(false)}
                    disabled={isClearingAdminM365}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 7,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdminM365Clear}
                    disabled={isClearingAdminM365}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 7,
                      border: 'none',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isClearingAdminM365 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Trash2 size={14} />
                    {isClearingAdminM365 ? 'Clearing Records...' : 'Yes, Delete All M365 Data'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SECTION 7: WORKING AGENTS ONBOARDING & SCHEMA INGESTION */}
      {activeSection === 'working_agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Banner / Header Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
            borderRadius: 12,
            padding: '24px 28px',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(49, 46, 129, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ maxWidth: 750 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Cpu size={13} color="#FFFFFF" /> Enterprise Agent Registry &amp; Ingestion
                </span>
                <span style={{
                  background: '#10B981',
                  color: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 800
                }}>
                  Live DB Table: ai_agent
                </span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                Working Agents Onboarding &amp; FinOps Governance
              </h2>
              <p style={{ fontSize: 13, color: '#E0E7FF', margin: 0, lineHeight: 1.5 }}>
                Admin console to ingest working AI agents into the company scorecard. Define monthly infrastructure costs, LLM token economics (input &amp; output per 1M tokens), baseline human task hours, employee wage rates, business functions, and teams.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                onClick={() => { setIsEditingExistingAgent(false); setIsAddAgentModalOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '10px 20px',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  color: '#312E81',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <Plus size={16} color="#4F46E5" />
                Connect New Agent
              </button>

              <button
                onClick={loadWorkingAgents}
                disabled={isLoadingWorkingAgents}
                title="Refresh registered working agents from database"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '10px 18px',
                  background: 'rgba(255, 255, 255, 0.22)',
                  border: '1.5px solid rgba(255, 255, 255, 0.55)',
                  borderRadius: 8,
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: isLoadingWorkingAgents ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.32)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)'}
              >
                <RefreshCw size={13.5} className={isLoadingWorkingAgents ? 'animate-spin' : ''} />
                Refresh DB Agents ({workingAgentsList.length})
              </button>
            </div>
          </div>

          {/* BOTTOM: Registered Working Agents Live Table */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 12,
            padding: 22,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Database size={18} color="#4F46E5" />
                  Currently Ingested Working Agents in Database ({workingAgentsList.length})
                </h3>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Live records in SQLite <code style={{ color: '#4F46E5', fontWeight: 700 }}>ai_agent</code> table with linked business functions, teams, and token pricing
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => { setIsEditingExistingAgent(false); setIsAddAgentModalOpen(true); }}
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.28)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <Plus size={16} />
                  Connect New Agent / API
                </button>
                <span style={{
                  background: '#EEF2FF',
                  color: '#4338CA',
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  Company: WaferWire (ID #1)
                </span>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 800 }}>
                    <th style={{ padding: '12px 14px' }}>Agent Name</th>
                    <th style={{ padding: '12px 14px' }}>Business Function &amp; Team</th>
                    <th style={{ padding: '12px 14px' }}>LLM Model</th>
                    <th style={{ padding: '12px 14px' }}>Token Pricing (per 1M)</th>
                    <th style={{ padding: '12px 14px' }}>Monthly Budget &amp; Infra</th>
                    <th style={{ padding: '12px 14px' }}>Task Baseline</th>
                    <th style={{ padding: '12px 14px' }}>Employee Wage &amp; Hours</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workingAgentsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8' }}>
                        {isLoadingWorkingAgents ? 'Loading agents from database...' : 'No working agents ingested yet. Use the JSON console above to onboard your first agent.'}
                      </td>
                    </tr>
                  ) : (
                    workingAgentsList.map((ag) => (
                      <tr key={ag.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Bot size={15} color="#4F46E5" />
                            {ag.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                            Type: <span style={{ fontFamily: 'monospace' }}>{ag.agent_type || 'workflow_agent'}</span>
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: 11.5
                          }}>
                            {ag.business_function || 'Eng & IT'}
                          </span>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                            Team: <strong>{ag.team || 'IT Service Desk'}</strong>
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            background: '#F5F3FF',
                            color: '#6D28D9',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: 11.5
                          }}>
                            {ag.model || 'gpt-4o'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                            In: <span style={{ color: '#047857' }}>${Number(ag.input_token_price_per_1m || 2.5).toFixed(2)}</span> / 1M
                          </div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
                            Out: <span style={{ color: '#047857' }}>${Number(ag.output_token_price_per_1m || 10.0).toFixed(2)}</span> / 1M
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1E293B' }}>
                            Budget: <span style={{ color: '#4F46E5' }}>${Number(ag.monthly_budget || 500.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                            Infra: ${Number(ag.monthly_infra_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={13} color="#0284C7" />
                            {ag.baseline_employee_hours} hrs
                          </div>
                          <div style={{ fontSize: 10.5, color: '#64748B' }}>
                            ({Math.round((ag.baseline_employee_hours || 0.5) * 60)} mins)
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1E293B' }}>
                            ${Number(ag.employee_monthly_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
                          </div>
                          <div style={{ fontSize: 11, color: '#0369A1', fontWeight: 600, marginTop: 2 }}>
                            ${((Number(ag.employee_monthly_rate || 6500.0)) / (Number(ag.employee_monthly_working_hours || 160.0))).toFixed(2)}/hr ({ag.employee_monthly_working_hours || 160} hrs/mo)
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            background: ag.is_active ? '#ECFDF5' : '#F1F5F9',
                            color: ag.is_active ? '#047857' : '#64748B',
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: 11
                          }}>
                            {ag.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={() => handleOpenTelemetryModal(ag)}
                              title="Configure live telemetry endpoints using Option A (Azure App Insights) or Option B (Dataverse OData)"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 12px',
                                background: '#0284C7',
                                border: 'none',
                                borderRadius: 6,
                                color: '#FFFFFF',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#0369A1'}
                              onMouseLeave={e => e.currentTarget.style.background = '#0284C7'}
                            >
                              <Radio size={12} />
                              Configure Endpoints (A/B)
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(ag)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 12px',
                                background: '#4F46E5',
                                border: 'none',
                                borderRadius: 6,
                                color: '#FFFFFF',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)'
                              }}
                            >
                              <Sliders size={12} />
                              Edit Values
                            </button>
                            <button
                              onClick={() => {
                              let configObj: any = null;
                              if (ag.config_json) {
                                try {
                                  configObj = JSON.parse(ag.config_json);
                                } catch (e) {
                                  configObj = null;
                                }
                              }
                              if (!configObj) {
                                configObj = {
                                  agent_name: ag.name,
                                  business_function: ag.business_function || 'Eng & IT',
                                  team: ag.team || 'IT Service Desk',
                                  model: ag.model || 'gpt-4o',
                                  input_token_price_per_1m: ag.input_token_price_per_1m ?? 2.50,
                                  output_token_price_per_1m: ag.output_token_price_per_1m ?? 10.00,
                                  monthly_infra_cost: ag.monthly_infra_cost ?? (ag.name.includes('Supply Chain') ? 200.0 : 45.0),
                                  monthly_budget: ag.monthly_budget ?? (ag.name.includes('Supply Chain') ? 300.0 : 100.0),
                                  baseline_employee_hours: ag.baseline_employee_hours ?? (ag.name.includes('Supply Chain') ? 0.33 : 0.25),
                                  employee_monthly_rate: ag.employee_monthly_rate ?? (ag.name.includes('Supply Chain') ? 1100.0 : 900.0),
                                  employee_monthly_working_hours: ag.employee_monthly_working_hours ?? 160,
                                  category: ag.category || (ag.name.includes('Supply Chain') ? 'built_with' : 'built_using'),
                                  agent_type: ag.agent_type || 'workflow_agent',
                                  description: ag.description || ''
                                };
                              }
                              setWorkingAgentJson(JSON.stringify(configObj, null, 2));
                              setWorkingAgentIngestResult({
                                type: 'success',
                                message: `Loaded configuration for "${ag.name}" into the editor. You can modify parameters and re-ingest.`
                              });
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            style={{
                              padding: '5px 12px',
                              background: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              color: '#334155',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Edit in JSON
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advanced JSON Ingestion Console (Collapsible for Technical Operators) */}
          <div style={{ marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setShowJsonIngest(!showJsonIngest)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 14px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                marginBottom: showJsonIngest ? 16 : 0,
                transition: 'all 0.15s'
              }}
            >
              <FileText size={14} color="#64748B" />
              <span>{showJsonIngest ? 'Hide Advanced JSON Ingestion Console' : 'Show Advanced JSON Ingestion & Raw Schema Tool'}</span>
              {showJsonIngest ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showJsonIngest && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(420px, 1.25fr) minmax(360px, 1fr)',
              gap: 24,
              alignItems: 'start'
            }}>
              {/* LEFT: JSON Editor & Ingestion Console */}
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: 12,
                padding: 22,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <FileText size={17} color="#4F46E5" /> Agent Input JSON
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      Paste or customize working agent configuration JSON
                    </div>
                  </div>
  
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        setWorkingAgentJson(TICKET_TRIAGE_AGENT_JSON);
                        setJsonValidationError(null);
                      }}
                      style={{
                        padding: '5px 10px',
                        background: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        borderRadius: 6,
                        color: '#4338CA',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Ticket Triage Preset
                    </button>
                    <button
                      onClick={() => {
                        setWorkingAgentJson(SUPPLY_CHAIN_COPILOT_AGENT_JSON);
                        setJsonValidationError(null);
                      }}
                      style={{
                        padding: '5px 10px',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 6,
                        color: '#15803D',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Supply Chain Preset (Copilot Studio)
                    </button>
                    <a
                      href="http://localhost:8000/api/v1/copilot-studio/ui"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '5px 10px',
                        background: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        color: '#38BDF8',
                        fontSize: 11,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      ? Open Copilot Studio Bot Console
                    </a>
                    <button
                      onClick={handleFormatJson}
                      style={{
                        padding: '5px 10px',
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        color: '#334155',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Format
                    </button>
                    <button
                      onClick={handleValidateJson}
                      style={{
                        padding: '5px 10px',
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        color: '#334155',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Validate
                    </button>
                  </div>
                </div>
  
                {/* Monospace Code Editor */}
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={workingAgentJson}
                    onChange={(e) => {
                      setWorkingAgentJson(e.target.value);
                      if (jsonValidationError) setJsonValidationError(null);
                    }}
                    rows={17}
                    spellCheck={false}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: '#38BDF8',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      fontSize: 12.5,
                      lineHeight: '1.5',
                      padding: '14px 16px',
                      borderRadius: 8,
                      border: jsonValidationError ? '1.5px solid #EF4444' : '1.5px solid #334155',
                      boxSizing: 'border-box',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
  
                {/* Validation Status message */}
                {jsonValidationError && (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 6,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: '#B91C1C'
                  }}>
                    <AlertCircle size={15} />
                    <span>{jsonValidationError}</span>
                  </div>
                )}
  
                {/* Ingestion Result Banner */}
                {workingAgentIngestResult && (
                  <div style={{
                    background: workingAgentIngestResult.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                    border: `1px solid ${workingAgentIngestResult.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      color: workingAgentIngestResult.type === 'success' ? '#047857' : '#B91C1C'
                    }}>
                      {workingAgentIngestResult.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {workingAgentIngestResult.message}
                    </div>
                    {workingAgentIngestResult.agents && workingAgentIngestResult.agents.length > 0 && (
                      <div style={{ fontSize: 11, color: '#065F46', display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                        {workingAgentIngestResult.agents.map((ag: any, idx: number) => (
                          <span key={idx} style={{ background: '#D1FAE5', padding: '3px 8px', borderRadius: 4 }}>
                            ID: <strong>#{ag.agent_id}</strong> | Name: <strong>{ag.agent_name}</strong> | Function: <strong>{ag.business_function}</strong> ({ag.team}) | Model: <strong>{ag.model}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
  
                {/* Action Submit Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={handleIngestWorkingAgent}
                    disabled={isIngestingWorkingAgent}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '11px 22px',
                      background: '#4F46E5',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isIngestingWorkingAgent ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                      transition: 'background 0.2s'
                    }}
                  >
                    <Save size={15} />
                    {isIngestingWorkingAgent ? 'Ingesting & Saving to DB...' : 'Ingest Working Agent to Database'}
                  </button>
                </div>
              </div>
  
              {/* RIGHT: Schema Specification & Documentation Card */}
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: 12,
                padding: 22,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <HelpCircle size={17} color="#4F46E5" /> Example Schema &amp; Parameters
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      Specification of parameters ingested into company database
                    </div>
                  </div>
  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(TICKET_TRIAGE_AGENT_JSON);
                      setCopiedSchema(true);
                      setTimeout(() => setCopiedSchema(false), 2000);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      background: copiedSchema ? '#ECFDF5' : '#F8FAFC',
                      border: `1px solid ${copiedSchema ? '#10B981' : '#CBD5E1'}`,
                      color: copiedSchema ? '#047857' : '#334155',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {copiedSchema ? <Check size={13} /> : <Copy size={13} />}
                    {copiedSchema ? 'Copied Example!' : 'Copy Example JSON'}
                  </button>
                </div>
  
                {/* Parameter Specification List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  maxHeight: 460,
                  overflowY: 'auto',
                  paddingRight: 4
                }}>
                  {[
                    {
                      key: 'agent_name',
                      type: 'string',
                      req: true,
                      example: '"Ticket Triage Agent"',
                      desc: 'Unique business display name for the agent.'
                    },
                    {
                      key: 'business_function',
                      type: 'string',
                      req: true,
                      example: '"Eng & IT" | "Customer" | "Finance"',
                      desc: 'Company organizational department.'
                    },
                    {
                      key: 'team',
                      type: 'string',
                      req: true,
                      example: '"IT Service Desk" | "Software Engineering"',
                      desc: 'Team owning or utilizing this working agent.'
                    },
                    {
                      key: 'model',
                      type: 'string',
                      req: true,
                      example: '"gpt-4o" | "claude-3-7-sonnet"',
                      desc: 'Underlying foundation LLM powering the agent loops.'
                    },
                    {
                      key: 'input_token_price_per_1m',
                      type: 'number (USD)',
                      req: true,
                      example: '2.50',
                      desc: 'LLM pricing per 1 million input tokens ($2.50 for GPT-4o).'
                    },
                    {
                      key: 'output_token_price_per_1m',
                      type: 'number (USD)',
                      req: true,
                      example: '10.00',
                      desc: 'LLM pricing per 1 million output tokens ($10.00 for GPT-4o).'
                    },
                    {
                      key: 'monthly_infra_cost',
                      type: 'number (USD)',
                      req: true,
                      example: '45.00',
                      desc: 'Fixed monthly cloud hosting, container & cluster run cost.'
                    },
                    {
                      key: 'monthly_budget',
                      type: 'number (USD)',
                      req: true,
                      example: '100.00',
                      desc: 'Allocated monthly operational budget limit for cost vs budget performance.'
                    },
                    {
                      key: 'baseline_employee_hours',
                      type: 'number (hours)',
                      req: true,
                      example: '0.25 (15 minutes)',
                      desc: 'Time human employee previously took to complete 1 manual task.'
                    },
                    {
                      key: 'employee_monthly_rate',
                      type: 'number (USD)',
                      req: true,
                      example: '900.00',
                      desc: 'Monthly human salary baseline for labor value calculation (~?75k/mo fully loaded).'
                    },
                    {
                      key: 'employee_monthly_working_hours',
                      type: 'number (hours)',
                      req: true,
                      example: '160',
                      desc: 'Standard monthly employee working hours (used as divisor to derive hourly rate: $900 / 160 = $5.63/hr).'
                    },
                    {
                      key: 'category & agent_type',
                      type: 'string (optional)',
                      req: false,
                      example: '"built_with", "workflow_agent"',
                      desc: 'Taxonomy classification for enterprise governance.'
                    }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#4F46E5' }}>
                          {item.key}
                        </span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>{item.type}</span>
                          {item.req ? (
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#DC2626', background: '#FEE2E2', padding: '1px 5px', borderRadius: 4 }}>
                              REQUIRED
                            </span>
                          ) : (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#64748B', background: '#E2E8F0', padding: '1px 5px', borderRadius: 4 }}>
                              OPTIONAL
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ color: '#475569', fontSize: 11.5, marginBottom: 3 }}>
                        {item.desc}
                      </div>
                      <div style={{ color: '#0369A1', fontSize: 11, fontFamily: 'monospace', background: '#F0F9FF', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
                        Example: {item.example}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
  
            )}
          </div>

          {/* DEDICATED DIRECT AGENT VALUES EDITOR MODAL */}
          {editingAgent && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}>
              <div style={{
                background: '#FFFFFF',
                borderRadius: 14,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: 720,
                maxHeight: '90vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      background: '#EEF2FF',
                      color: '#4F46E5',
                      padding: 8,
                      borderRadius: 8,
                      display: 'flex'
                    }}>
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                        Edit Agent Parameters: {editingAgent.name}
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748B' }}>
                        Changes are saved directly into the SQLite database and will immediately recalculate all scorecard metrics.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingAgent(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex'
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Form Body */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Section 1: Financials & Infra */}
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DollarSign size={15} color="#4F46E5" />
                      Monthly Infrastructure & Budgeting
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Monthly Infra / Capacity Pack Cost ($/mo)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={agentFormValues.monthly_infra_cost}
                          onChange={(e) => setAgentFormValues({ ...agentFormValues, monthly_infra_cost: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                        <span style={{ fontSize: 11, color: '#64748B' }}>Fixed monthly server or Copilot Studio capacity fee.</span>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Monthly Budget Allocation ($/mo)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={agentFormValues.monthly_budget}
                          onChange={(e) => setAgentFormValues({ ...agentFormValues, monthly_budget: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                        <span style={{ fontSize: 11, color: '#64748B' }}>Departmental AI spending cap for cost vs budget.</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Human Labor Benchmark & Hourly Wage */}
                  <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={15} color="#0284C7" />
                      Human Capital & Labor Rate Benchmark
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Baseline Hours Saved / Task
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={agentFormValues.baseline_employee_hours}
                          onChange={(e) => setAgentFormValues({ ...agentFormValues, baseline_employee_hours: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                        <span style={{ fontSize: 11, color: '#0369A1', fontWeight: 600 }}>
                          = {Math.round(agentFormValues.baseline_employee_hours * 60)} minutes/task
                        </span>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Employee Monthly Salary ($/mo)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={agentFormValues.employee_monthly_rate}
                          onChange={(e) => setAgentFormValues({ ...agentFormValues, employee_monthly_rate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                        <span style={{ fontSize: 11, color: '#64748B' }}>Fully loaded monthly salary.</span>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Working Hours / Month
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={agentFormValues.employee_monthly_working_hours}
                          onChange={(e) => setAgentFormValues({ ...agentFormValues, employee_monthly_working_hours: parseFloat(e.target.value) || 160 })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                        <span style={{ fontSize: 11, color: '#64748B' }}>Standard: 160 hrs/mo.</span>
                      </div>
                    </div>

                    <div style={{
                      marginTop: 12,
                      padding: '8px 12px',
                      background: '#EFF6FF',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>
                        Calculated Employee Hourly Wage:
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF' }}>
                        ${((agentFormValues.employee_monthly_rate || 0) / (agentFormValues.employee_monthly_working_hours || 160)).toFixed(2)}/hr
                      </span>
                    </div>
                  </div>

                  {/* Section 3: Model & Token Rates */}
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={15} color="#10B981" />
                      Model & Token Pricing
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Model Identifier
                        </label>
                        <input
                          type="text"
                          value={agentFormValues.model}
                          onChange={(e) => setAgentFormValues({ ...agentFormValues, model: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Input Token Rate ($/1M)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={agentFormValues.input_token_price_per_1m}
                          onChange={(e) => setAgentFormValues({ ...agentFormValues, input_token_price_per_1m: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Output Token Rate ($/1M)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={agentFormValues.output_token_price_per_1m}
                          onChange={(e) => setAgentFormValues({ ...agentFormValues, output_token_price_per_1m: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Function & Team Mapping */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        Business Function
                      </label>
                      <select
                        value={agentFormValues.business_function}
                        onChange={(e) => setAgentFormValues({ ...agentFormValues, business_function: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          background: '#FFFFFF'
                        }}
                      >
                        <option value="Eng & IT">Eng & IT</option>
                        <option value="Operations">Operations</option>
                        <option value="Finance">Finance</option>
                        <option value="Sales">Sales</option>
                        <option value="Customer">Customer</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={agentFormValues.team}
                        onChange={(e) => setAgentFormValues({ ...agentFormValues, team: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  borderBottomLeftRadius: 14,
                  borderBottomRightRadius: 14,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12
                }}>
                  <button
                    onClick={() => setEditingAgent(null)}
                    disabled={isSavingAgentForm}
                    style={{
                      padding: '8px 18px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAgentForm}
                    disabled={isSavingAgentForm}
                    style={{
                      padding: '8px 22px',
                      background: '#4F46E5',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      cursor: isSavingAgentForm ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    {isSavingAgentForm ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving to Database...
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        Save Changes to Database
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED CONNECT NEW LIVE AGENT / API INTEGRATION MODAL */}
          {isAddAgentModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(5px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}>
              <div style={{
                background: '#FFFFFF',
                borderRadius: 16,
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
                width: '100%',
                maxWidth: 840,
                maxHeight: '92vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #E2E8F0',
                fontFamily: 'var(--font-body, Figtree, -apple-system, sans-serif)',
                letterSpacing: '-0.01em'
              }}>
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
                    }}>
                      <Bot size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                        {isEditingExistingAgent ? `Configure Telemetry: ${newAgentForm.agent_name}` : 'Connect New Live Agent / API Integration'}
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748B' }}>
                        {isEditingExistingAgent
                          ? 'Configure Option A (Azure App Insights) or Option B (Dataverse OData) endpoints, test live connectivity, and link directly to this agent.'
                          : 'Register a new enterprise agent, configure FinOps benchmarks, and connect its live telemetry or emulation feed.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddAgentModalOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'flex',
                      borderRadius: 6
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Form Body */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {/* Step 1: Select Platform Provider */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
                      1. Select Agent Architecture &amp; Platform Provider
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {[
                        { id: 'copilot_studio', name: 'Copilot Studio', sub: 'Low-Code Dataverse Bot', icon: Radio, pack: '$200/mo Pack' },
                        { id: 'azure_openai', name: 'Azure OpenAI', sub: 'Custom GPT-4o Token Bot', icon: Cpu, pack: '$45/mo + Tokens' },
                        { id: 'anthropic_claude', name: 'Anthropic Claude', sub: 'Claude Workspace API', icon: Terminal, pack: '$50/mo API' },
                        { id: 'developer_tool', name: 'Developer Seat', sub: 'IDE Productivity Tool', icon: Code, pack: '$30/seat/mo' }
                      ].map((prov) => {
                        const Icon = prov.icon;
                        const isSel = newAgentForm.provider === prov.id;
                        return (
                          <div
                            key={prov.id}
                            onClick={() => handleProviderChange(prov.id)}
                            style={{
                              border: isSel ? '2px solid #4F46E5' : '1.5px solid #E2E8F0',
                              background: isSel ? '#EEF2FF' : '#F8FAFC',
                              borderRadius: 10,
                              padding: '12px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Icon size={20} color={isSel ? '#4F46E5' : '#64748B'} style={{ marginBottom: 6 }} />
                            <div style={{ fontSize: 13, fontWeight: 800, color: isSel ? '#312E81' : '#1E293B' }}>{prov.name}</div>
                            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>{prov.sub}</div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: isSel ? '#4F46E5' : '#0284C7', marginTop: 6, background: '#FFFFFF', padding: '2px 6px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                              {prov.pack}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Agent Identity & Organization */}
                  <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 12 }}>
                      2. Agent Identity &amp; Organizational Placement
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Agent Display Name *
                        </label>
                        <input
                          type="text"
                          value={newAgentForm.agent_name}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, agent_name: e.target.value })}
                          placeholder="e.g. Mailbox Async Agent"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#0F172A',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Business Function
                        </label>
                        <select
                          value={newAgentForm.business_function}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, business_function: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            background: '#FFFFFF'
                          }}
                        >
                          <option value="Operations">Operations</option>
                          <option value="Eng & IT">Eng & IT</option>
                          <option value="Finance">Finance</option>
                          <option value="Sales">Sales</option>
                          <option value="Customer">Customer</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Team Name
                        </label>
                        <input
                          type="text"
                          value={newAgentForm.team}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, team: e.target.value })}
                          placeholder="e.g. Supply Chain"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        Agent Capability &amp; Task Description
                      </label>
                      <input
                        type="text"
                        value={newAgentForm.description}
                        onChange={(e) => setNewAgentForm({ ...newAgentForm, description: e.target.value })}
                        placeholder="Brief summary of tasks automated by this agent..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#334155',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>

                  {/* Step 3: Live API Connection & Telemetry Credentials */}
                  <div style={{ background: '#FFFFFF', padding: 18, borderRadius: 12, border: '1.5px solid #C7D2FE', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1E1B4B', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Link2 size={16} color="#4F46E5" />
                          3. Live API &amp; Telemetry Stream Credentials
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                          Connect your enterprise Microsoft 365 Dataverse tenant or Azure OpenAI endpoint for real-time telemetry streaming.
                        </div>
                      </div>

                      <button
                        onClick={handleTestNewAgentConnection}
                        disabled={isTestingConnection}
                        style={{
                          padding: '6px 14px',
                          background: '#EEF2FF',
                          border: '1px solid #C7D2FE',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#4338CA',
                          cursor: isTestingConnection ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {isTestingConnection ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            Testing Ping...
                          </>
                        ) : (
                          <>
                            <Zap size={12} />
                            Test Connection
                          </>
                        )}
                      </button>
                    </div>

                    {/* Connection Test Result Badge */}
                    {connectionTestResult.status && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        marginBottom: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: connectionTestResult.status === 'success' ? '#F0FDF4' : connectionTestResult.status === 'warning' ? '#FEFCE8' : '#FEF2F2',
                        color: connectionTestResult.status === 'success' ? '#166534' : connectionTestResult.status === 'warning' ? '#854D0E' : '#991B1B',
                        border: `1px solid ${connectionTestResult.status === 'success' ? '#BBF7D0' : connectionTestResult.status === 'warning' ? '#FEF08A' : '#FECACA'}`
                      }}>
                        {connectionTestResult.status === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                        <span>{connectionTestResult.message}</span>
                        {connectionTestResult.latency_ms && (
                          <span style={{ marginLeft: 'auto', fontSize: 11, background: '#DCFCE7', padding: '2px 6px', borderRadius: 4 }}>
                            {connectionTestResult.latency_ms}ms
                          </span>
                        )}
                      </div>
                    )}

                    {/* Conditional Fields based on Provider */}
                    {newAgentForm.provider === 'copilot_studio' ? (
                      <div>
                        {/* Option A vs Option B Selector */}
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            Select Copilot Studio Telemetry Method:
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {/* Option A Card */}
                            <div
                              onClick={() => {
                                setCopilotMethod('option_a');
                                setNewAgentForm(prev => ({ ...prev, copilot_method: 'option_a' }));
                                setConnectionTestResult({ status: null, message: '' });
                              }}
                              style={{
                                border: copilotMethod === 'option_a' ? '2px solid #2563EB' : '1.5px solid #CBD5E1',
                                background: copilotMethod === 'option_a' ? '#EFF6FF' : '#FFFFFF',
                                borderRadius: 10,
                                padding: '12px 14px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: copilotMethod === 'option_a' ? '#1D4ED8' : '#1E293B' }}>
                                  Option A: Azure App Insights
                                </span>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  background: copilotMethod === 'option_a' ? '#DBEAFE' : '#F1F5F9',
                                  color: copilotMethod === 'option_a' ? '#1E40AF' : '#64748B',
                                  padding: '2px 7px',
                                  borderRadius: 4
                                }}>
                                  Recommended
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                                Live event streaming via Azure Monitor KQL. Captures user turns, latency, and sessions.
                              </div>
                            </div>

                            {/* Option B Card */}
                            <div
                              onClick={() => {
                                setCopilotMethod('option_b');
                                setNewAgentForm(prev => ({ ...prev, copilot_method: 'option_b' }));
                                setConnectionTestResult({ status: null, message: '' });
                              }}
                              style={{
                                border: copilotMethod === 'option_b' ? '2px solid #4F46E5' : '1.5px solid #CBD5E1',
                                background: copilotMethod === 'option_b' ? '#EEF2FF' : '#FFFFFF',
                                borderRadius: 10,
                                padding: '12px 14px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: copilotMethod === 'option_b' ? '#4338CA' : '#1E293B' }}>
                                  Option B: Dataverse OData
                                </span>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  background: copilotMethod === 'option_b' ? '#E0E7FF' : '#F1F5F9',
                                  color: copilotMethod === 'option_b' ? '#3730A3' : '#64748B',
                                  padding: '2px 7px',
                                  borderRadius: 4
                                }}>
                                  Power Platform Native
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                                Queries conversationtranscript and msdyn_botsession tables via OAuth2 service principal.
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Option A Input Fields */}
                        {copilotMethod === 'option_a' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                Azure Application Insights App ID *
                              </label>
                              <input
                                type="text"
                                value={newAgentForm.app_insights_app_id}
                                onChange={(e) => setNewAgentForm({ ...newAgentForm, app_insights_app_id: e.target.value })}
                                placeholder="e.g. 7a12b345-6789-4abc-def0-..."
                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                              />
                              <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                                Azure Portal → Application Insights → API Access → Application ID
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                Application Insights API Key *
                              </label>
                              <input
                                type="password"
                                value={newAgentForm.app_insights_key}
                                onChange={(e) => setNewAgentForm({ ...newAgentForm, app_insights_key: e.target.value })}
                                placeholder="e.g. v1_aBcDeF123456789..."
                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                              />
                              <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                                Read telemetry key generated in API Access tab
                              </div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                Copilot Studio Agent / Bot Schema ID *
                              </label>
                              <input
                                type="text"
                                value={newAgentForm.copilot_bot_id}
                                onChange={(e) => setNewAgentForm({ ...newAgentForm, copilot_bot_id: e.target.value })}
                                placeholder="e.g. 701c468f-8db2-4972-abaa-cdd76a76f9b7"
                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                              />
                              <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                                Bot ID visible in your Copilot Studio URL: <code>web.powerva.microsoft.com/.../agents/&lt;BOT_ID&gt;</code>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Option B Input Fields */}
                        {copilotMethod === 'option_b' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                Microsoft Dataverse Environment URL *
                              </label>
                              <input
                                type="text"
                                value={newAgentForm.dataverse_url}
                                onChange={(e) => setNewAgentForm({ ...newAgentForm, dataverse_url: e.target.value })}
                                placeholder="https://org46960896.crm.dynamics.com"
                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                              />
                              <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                                Power Platform Admin Center → Environments → Environment URL
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                Azure Entra ID Tenant ID *
                              </label>
                              <input
                                type="text"
                                value={newAgentForm.tenant_id}
                                onChange={(e) => setNewAgentForm({ ...newAgentForm, tenant_id: e.target.value })}
                                placeholder="e.g. e6e6c779-4c40-45d8-9921-..."
                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                Azure Entra ID Client ID (App Registration) *
                              </label>
                              <input
                                type="text"
                                value={newAgentForm.client_id}
                                onChange={(e) => setNewAgentForm({ ...newAgentForm, client_id: e.target.value })}
                                placeholder="e.g. d9b73461-8261-4f10-9b30-..."
                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                Client Secret *
                              </label>
                              <input
                                type="password"
                                value={newAgentForm.client_secret}
                                onChange={(e) => setNewAgentForm({ ...newAgentForm, client_secret: e.target.value })}
                                placeholder="••••••••••••••••"
                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                Copilot Studio Agent / Bot Schema ID *
                              </label>
                              <input
                                type="text"
                                value={newAgentForm.copilot_bot_id}
                                onChange={(e) => setNewAgentForm({ ...newAgentForm, copilot_bot_id: e.target.value })}
                                placeholder="e.g. 701c468f-8db2-4972-abaa-cdd76a76f9b7"
                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : newAgentForm.provider === 'azure_openai' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                            Azure OpenAI Endpoint URL
                          </label>
                          <input
                            type="text"
                            value={newAgentForm.api_endpoint}
                            onChange={(e) => setNewAgentForm({ ...newAgentForm, api_endpoint: e.target.value })}
                            placeholder="https://<resource>.openai.azure.com"
                            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                            Model Deployment Name
                          </label>
                          <input
                            type="text"
                            value={newAgentForm.deployment_name}
                            onChange={(e) => setNewAgentForm({ ...newAgentForm, deployment_name: e.target.value })}
                            placeholder="gpt-4o"
                            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Admin API License Key / Authentication Token
                        </label>
                        <input
                          type="password"
                          value={newAgentForm.api_key}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, api_key: e.target.value })}
                          placeholder="••••••••••••••••••••••••••••••••"
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Step 4: FinOps Economics & Human Capital Rates */}
                  <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 12 }}>
                      4. FinOps Infrastructure &amp; Human Capital Benchmarks
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Monthly Infra / Pack Fee ($)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={newAgentForm.monthly_infra_cost}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, monthly_infra_cost: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                          Copilot Studio Pack ($200) or Azure host
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Monthly Budget Cap ($)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={newAgentForm.monthly_budget}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, monthly_budget: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                          Hard monthly FinOps cap
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Target Eval Pass SLA (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={newAgentForm.target_eval_sla}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, target_eval_sla: parseFloat(e.target.value) || 90.0 })}
                          style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 10, color: '#2563EB', marginTop: 2 }}>
                          Benchmark target (e.g. 92% SLA)
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Assigned Team Users
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={newAgentForm.assigned_users}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, assigned_users: parseInt(e.target.value) || 1 })}
                          style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                          Licensed seats for adoption rate
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Task Saved (Hours)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newAgentForm.baseline_employee_hours}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, baseline_employee_hours: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 10, color: '#0369A1', marginTop: 2 }}>
                          = {Math.round(newAgentForm.baseline_employee_hours * 60)} mins/task
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Employee Salary ($/mo)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={newAgentForm.employee_monthly_rate}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, employee_monthly_rate: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 10, color: '#059669', marginTop: 2 }}>
                          = ${(newAgentForm.employee_monthly_rate / 160).toFixed(2)}/hr wage
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12
                }}>
                  <button
                    onClick={() => setIsAddAgentModalOpen(false)}
                    disabled={isSubmittingNewAgent}
                    style={{
                      padding: '8px 18px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNewAgent}
                    disabled={isSubmittingNewAgent}
                    style={{
                      padding: '8px 24px',
                      background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      cursor: isSubmittingNewAgent ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
                    }}
                  >
                    {isSubmittingNewAgent ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Connecting &amp; Registering Agent...
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        Connect &amp; Activate Agent
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

