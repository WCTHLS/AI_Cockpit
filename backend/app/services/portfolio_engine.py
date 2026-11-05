"""
Enterprise AI Portfolio Valuation & FinOps Engine.
Centralized Single Source of Truth for Autonomous Agents, Developer Tool Seats,
and Microsoft 365 Copilot Estate.
"""
from typing import Optional, List, Dict, Any
from ..database import query_all
from ..data_store import store

DEFAULT_HOURLY_RATES: Dict[str, float] = {
    'Eng & IT': 25.0,
    'Operations': 20.0,
    'Finance': 22.0,
    'Sales': 24.0,
    'Customer': 20.0,
}

def get_hourly_rate(dept: Optional[str]) -> float:
    if not dept:
        return 22.0
    d_lower = dept.lower()
    if 'eng' in d_lower or 'it' in d_lower or 'tech' in d_lower:
        return DEFAULT_HOURLY_RATES['Eng & IT']
    if 'operat' in d_lower or 'supply' in d_lower or 'logist' in d_lower:
        return DEFAULT_HOURLY_RATES['Operations']
    if 'finan' in d_lower or 'account' in d_lower:
        return DEFAULT_HOURLY_RATES['Finance']
    if 'sale' in d_lower or 'bid' in d_lower or 'market' in d_lower:
        return DEFAULT_HOURLY_RATES['Sales']
    if 'custom' in d_lower or 'support' in d_lower:
        return DEFAULT_HOURLY_RATES['Customer']
    return 22.0

def get_developer_tools_summary(effective_function: Optional[str] = None, cost_per_seat: float = 30.0) -> Dict[str, Any]:
    if effective_function and effective_function != 'All Functions' and 'Eng' not in effective_function and 'IT' not in effective_function:
        return {
            'cost': 0.0, 'budget': 0.0, 'hours_saved': 0.0, 'gross_value': 0.0,
            'net_value': 0.0, 'seats_count': 0, 'active_count': 0,
            'action_counts': {'accelerate': 0, 'optimize': 0, 'experiment': 0, 'intervene': 0}
        }

    try:
        dev_seats = query_all("""
            SELECT * FROM developer_seats 
            WHERE developer_id NOT LIKE '%waferwire.com%'
              AND LOWER(developer_id) NOT IN (SELECT LOWER(developer_id) FROM deleted_developer_seats)
              AND LOWER(developer_email) NOT IN (SELECT LOWER(developer_email) FROM deleted_developer_seats)
        """)
    except Exception:
        try:
            dev_seats = query_all("SELECT * FROM developer_seats WHERE developer_id NOT LIKE '%waferwire.com%'")
        except Exception:
            dev_seats = []

    if not dev_seats:
        return {
            'cost': 0.0, 'budget': 0.0, 'hours_saved': 0.0, 'gross_value': 0.0,
            'net_value': 0.0, 'seats_count': 0, 'active_count': 0,
            'action_counts': {'accelerate': 0, 'optimize': 0, 'experiment': 0, 'intervene': 0}
        }

    count = len(dev_seats)
    total_cost = round(count * cost_per_seat, 2)
    total_budget = round(count * 50.0, 2)
    total_hours = round(sum(float(ds.get('hours_saved') or 0.0) for ds in dev_seats), 1)
    rate = DEFAULT_HOURLY_RATES['Eng & IT']
    gross_val = round(total_hours * rate, 2)
    net_val = round(gross_val - total_cost, 2)

    return {
        'cost': total_cost,
        'budget': total_budget,
        'hours_saved': total_hours,
        'gross_value': gross_val,
        'net_value': net_val,
        'seats_count': count,
        'active_count': count,
        'action_counts': {'accelerate': 1 if count > 0 else 0, 'optimize': 0, 'experiment': 0, 'intervene': 0}
    }

def get_m365_summary(effective_function: Optional[str] = None, cost_per_seat: float = 30.0) -> Dict[str, Any]:
    try:
        sql = 'SELECT * FROM m365_copilot_seats'
        if effective_function and effective_function != 'All Functions':
            sql += f" WHERE department LIKE '%{effective_function}%'"
        m365_seats = query_all(sql)
    except Exception:
        m365_seats = []

    if not m365_seats:
        return {
            'cost': 0.0, 'budget': 0.0, 'hours_saved': 0.0, 'gross_value': 0.0,
            'net_value': 0.0, 'seats_count': 0, 'active_count': 0, 'dormant_count': 0,
            'department_breakdown': {},
            'action_counts': {'accelerate': 0, 'optimize': 0, 'experiment': 0, 'intervene': 0}
        }

    count = len(m365_seats)
    total_cost = round(count * cost_per_seat, 2)
    total_budget = round(count * cost_per_seat, 2)
    total_hours = 0.0
    total_gross = 0.0
    active_count = 0
    dormant_count = 0

    dept_map: Dict[str, Dict[str, Any]] = {}
    actions = {'accelerate': 0, 'optimize': 0, 'experiment': 0, 'intervene': 0}

    for s in m365_seats:
        hrs = float(s.get('hours_saved') or 0.0)
        dept = s.get('department') or 'Operations'
        rate = get_hourly_rate(dept)
        gross = round(hrs * rate, 2)
        total_hours += hrs
        total_gross += gross

        status = (s.get('status') or 'ACTIVE').upper()
        prompts = int(s.get('total_prompts') or 0)
        inactive_days = int(s.get('inactive_days') or 0)

        if status == 'DORMANT' or inactive_days >= 30:
            dormant_count += 1
            actions['intervene'] += 1
        elif status == 'LAPSING' or inactive_days >= 21:
            active_count += 1
            actions['experiment'] += 1
        elif prompts >= 150:
            active_count += 1
            actions['accelerate'] += 1
        else:
            active_count += 1
            actions['optimize'] += 1

        if dept not in dept_map:
            dept_map[dept] = {'seats': 0, 'cost': 0.0, 'budget': 0.0, 'hours_saved': 0.0, 'gross_value': 0.0, 'net_value': 0.0}
        dept_map[dept]['seats'] += 1
        dept_map[dept]['cost'] += cost_per_seat
        dept_map[dept]['budget'] += cost_per_seat
        dept_map[dept]['hours_saved'] += hrs
        dept_map[dept]['gross_value'] += gross

    for d in dept_map.values():
        d['hours_saved'] = round(d['hours_saved'], 1)
        d['cost'] = round(d['cost'], 2)
        d['budget'] = round(d['budget'], 2)
        d['gross_value'] = round(d['gross_value'], 2)
        d['net_value'] = round(d['gross_value'] - d['cost'], 2)

    total_hours = round(total_hours, 1)
    total_gross = round(total_gross, 2)
    total_net = round(total_gross - total_cost, 2)

    return {
        'cost': total_cost,
        'budget': total_budget,
        'hours_saved': total_hours,
        'gross_value': total_gross,
        'net_value': total_net,
        'seats_count': count,
        'active_count': active_count,
        'dormant_count': dormant_count,
        'department_breakdown': dept_map,
        'action_counts': actions
    }

def get_unified_summary(target_month: Optional[str] = None, effective_function: Optional[str] = None, cohort: Optional[str] = 'enterprise') -> Dict[str, Any]:
    month = target_month or (store.get_months()[-1] if store.get_months() else '2026-09')
    agents = store.get_processed_agents(month, effective_function, cohort=cohort)

    agent_net = sum(a['net_value'] for a in agents)
    agent_gross = sum(a['gross_value'] for a in agents)
    agent_cost = sum(a['cost'] for a in agents)
    agent_hours = sum(a['hours_saved'] for a in agents)

    dev_stats = get_developer_tools_summary(effective_function)
    m365_stats = get_m365_summary(effective_function)

    if cohort == 'pilot':
        dev_stats = {'cost': 0.0, 'budget': 0.0, 'hours_saved': 0.0, 'gross_value': 0.0, 'net_value': 0.0, 'seats_count': 0, 'active_count': 0, 'action_counts': {'accelerate': 0, 'optimize': 0, 'experiment': 0, 'intervene': 0}}
        m365_stats = {'cost': 0.0, 'budget': 0.0, 'hours_saved': 0.0, 'gross_value': 0.0, 'net_value': 0.0, 'seats_count': 0, 'active_count': 0, 'dormant_count': 0, 'department_breakdown': {}, 'action_counts': {'accelerate': 0, 'optimize': 0, 'experiment': 0, 'intervene': 0}}
        tot_net = round(agent_net, 2)
        tot_gross = round(agent_gross, 2)
        tot_cost = round(agent_cost, 2)
        tot_hours = round(agent_hours, 1)
    else:
        tot_net = round(agent_net + dev_stats['net_value'] + m365_stats['net_value'], 2)
        tot_gross = round(agent_gross + dev_stats['gross_value'] + m365_stats['gross_value'], 2)
        tot_cost = round(agent_cost + dev_stats['cost'] + m365_stats['cost'], 2)
        tot_hours = round(agent_hours + dev_stats['hours_saved'] + m365_stats['hours_saved'], 1)
    roi = round(tot_gross / tot_cost, 2) if tot_cost > 0 else 0.0

    # Action counts strictly reflect custom autonomous agents portfolio
    action_counts = {'accelerate': 0, 'optimize': 0, 'experiment': 0, 'intervene': 0}
    for a in agents:
        act = (a.get('action') or '').lower()
        if act in action_counts:
            action_counts[act] += 1

    return {
        'month': month,
        'total_net_value': tot_net,
        'total_gross_value': tot_gross,
        'total_cost': tot_cost,
        'roi_ratio': roi,
        'active_agents': len(agents),
        'total_hours_saved': tot_hours,
        'action_counts': action_counts,
        'breakdown': {
            'autonomous_agents': {
                'cost': round(agent_cost, 2),
                'gross_value': round(agent_gross, 2),
                'net_value': round(agent_net, 2),
                'hours_saved': round(agent_hours, 1),
                'count': len(agents)
            },
            'developer_seats': dev_stats,
            'm365_copilot': m365_stats
        }
    }

def get_unified_by_function(target_month: Optional[str] = None, cohort: Optional[str] = 'enterprise') -> List[Dict[str, Any]]:
    month = target_month or (store.get_months()[-1] if store.get_months() else '2026-09')
    # Single query for all agents in this cohort, group in memory for sub-millisecond execution
    all_cohort_agents = store.get_processed_agents(month, None, cohort=cohort)

    func_map = {}
    for a in all_cohort_agents:
        f = a['function']
        if f not in func_map:
            func_map[f] = {'agents': [], 'net': 0.0, 'gross': 0.0, 'cost': 0.0, 'hours': 0.0}
        func_map[f]['agents'].append(a)
        func_map[f]['net'] += a['net_value']
        func_map[f]['gross'] += a['gross_value']
        func_map[f]['cost'] += a['cost']
        func_map[f]['hours'] += a['hours_saved']

    if cohort == 'pilot':
        funcs = sorted(list(func_map.keys()))
        m365_dept_map = {}
    else:
        funcs = store.get_functions()
        m365_all = get_m365_summary(None)
        m365_dept_map = m365_all.get('department_breakdown', {})

    results = []
    for f in funcs:
        f_data = func_map.get(f, {'agents': [], 'net': 0.0, 'gross': 0.0, 'cost': 0.0, 'hours': 0.0})
        net = f_data['net']
        gross = f_data['gross']
        cost = f_data['cost']
        hours = f_data['hours']
        sys_cnt = len(f_data['agents'])

        if cohort == 'enterprise':
            if 'Eng' in f or 'IT' in f:
                dev_stats = get_developer_tools_summary(f)
                net += dev_stats['net_value']
                gross += dev_stats['gross_value']
                cost += dev_stats['cost']
                hours += dev_stats['hours_saved']
                if dev_stats['seats_count'] > 0:
                    sys_cnt += 1

            for dept_name, m_data in m365_dept_map.items():
                if (f == dept_name) or (f == 'Eng & IT' and ('Eng' in dept_name or 'IT' in dept_name)) or (f in dept_name):
                    net += m_data['net_value']
                    gross += m_data['gross_value']
                    cost += m_data['cost']
                    hours += m_data['hours_saved']
                    sys_cnt += m_data['seats']

        roi = round(gross / cost, 2) if cost > 0 else 0.0
        results.append({
            'function_name': f,
            'net_value': round(net, 2),
            'gross_value': round(gross, 2),
            'cost': round(cost, 2),
            'hours_saved': round(hours, 1),
            'roi': roi,
            'agent_count': sys_cnt
        })

    results.sort(key=lambda x: x['net_value'], reverse=True)
    return results

def get_unified_cost_breakdown(target_month: Optional[str] = None, function: Optional[str] = None, cohort: Optional[str] = 'enterprise') -> List[Dict[str, Any]]:
    month = target_month or (store.get_months()[-1] if store.get_months() else '2026-09')
    agents = store.get_processed_agents(month, function, cohort=cohort)

    if cohort == 'pilot':
        infra_cost = sum(45.0 if 'IT' in a.get('name','') else (200.0 if 'Supply' in a.get('name','') else 50.0) for a in agents)
        token_cost = sum(max(0.0, round(a.get('cost', 0) - (45.0 if 'IT' in a.get('name','') else (200.0 if 'Supply' in a.get('name','') else 50.0)), 2)) for a in agents)
        infra_budget = 350.0
        token_budget = 100.0
        total_cost = infra_cost + token_cost
        return [
            {
                'factor': 'Platform & Infrastructure',
                'subfactor': 'Copilot Studio Message Packs & Dedicated Hosting',
                'cost': round(infra_cost, 2),
                'budget': infra_budget,
                'variance': round(infra_cost - infra_budget, 2),
                'pct_of_total': round((infra_cost / total_cost * 100), 1) if total_cost > 0 else 0.0
            },
            {
                'factor': 'Model Token Consumption',
                'subfactor': 'Azure OpenAI GPT-4o Ingest & Triage Inference',
                'cost': round(token_cost, 2),
                'budget': token_budget,
                'variance': round(token_cost - token_budget, 2),
                'pct_of_total': round((token_cost / total_cost * 100), 1) if total_cost > 0 else 0.0
            }
        ]

    total_agent_budget = sum(a.get('budget', 500.0) for a in agents)
    total_agent_cost = sum(a.get('cost', 0.0) for a in agents)

    # 4 Core Enterprise FinOps AI Cost Pillars (balanced across the 1,200 agent fleet)
    token_cost = round(total_agent_cost * 0.55, 2)
    token_budget = round(total_agent_budget * 0.55, 2)

    infra_cost = round(total_agent_cost * 0.24, 2)
    infra_budget = round(total_agent_budget * 0.24, 2)

    rag_cost = round(total_agent_cost * 0.13, 2)
    rag_budget = round(total_agent_budget * 0.13, 2)

    gov_cost = round(total_agent_cost - (token_cost + infra_cost + rag_cost), 2)
    gov_budget = round(total_agent_budget - (token_budget + infra_budget + rag_budget), 2)

    total_cost = total_agent_cost

    items = [
        {
            'factor': 'Model Token Consumption',
            'subfactor': 'Multi-Model LLM Foundation Inference (GPT-4o, Claude 3.5, Gemini 2.0 Pro)',
            'cost': token_cost,
            'budget': token_budget,
            'variance': round(token_cost - token_budget, 2),
            'pct_of_total': 55.0
        },
        {
            'factor': 'Platform & Infrastructure',
            'subfactor': 'Autonomous Agent Container Pods, Microservices & Runtimes',
            'cost': infra_cost,
            'budget': infra_budget,
            'variance': round(infra_cost - infra_budget, 2),
            'pct_of_total': 24.0
        },
        {
            'factor': 'Vector RAG & Knowledge Pipelines',
            'subfactor': 'Enterprise Vector Database Embeddings, Data Sync & Document Indexing',
            'cost': rag_cost,
            'budget': rag_budget,
            'variance': round(rag_cost - rag_budget, 2),
            'pct_of_total': 13.0
        },
        {
            'factor': 'AI Safety, Governance & Guardrails',
            'subfactor': 'Real-Time Prompt Injection Defense, DLP Content Filtering & Audit Telemetry',
            'cost': gov_cost,
            'budget': gov_budget,
            'variance': round(gov_cost - gov_budget, 2),
            'pct_of_total': 8.0
        }
    ]

    return items

def get_unified_team_costs(target_month: Optional[str] = None, effective_function: Optional[str] = None, cohort: Optional[str] = 'enterprise') -> List[Dict[str, Any]]:
    month = target_month or (store.get_months()[-1] if store.get_months() else '2026-09')
    agents = store.get_processed_agents(month, effective_function, cohort=cohort)

    teams_map: Dict[str, Dict[str, Any]] = {}
    for a in agents:
        t = a['team']
        if t not in teams_map:
            teams_map[t] = {
                'team': t,
                'function': a['function'],
                'cost': 0.0,
                'budget': 0.0,
                'agent_count': 0,
                'gross_value': 0.0,
                'hours_saved': 0.0,
                'is_seat_license': False
            }
        teams_map[t]['cost'] += a['cost']
        teams_map[t]['budget'] += a['budget']
        teams_map[t]['gross_value'] += a.get('gross_value', 0.0)
        teams_map[t]['hours_saved'] += a.get('hours_saved', 0.0)
        teams_map[t]['agent_count'] += 1

    if not effective_function or effective_function == 'All Functions' or 'Eng' in effective_function or 'IT' in effective_function:
        dev_stats = get_developer_tools_summary(effective_function)
        if dev_stats['seats_count'] > 0:
            teams_map['Software Engineering (Antigravity IDE)'] = {
                'team': 'Software Engineering (Antigravity IDE)',
                'function': 'Eng & IT',
                'cost': dev_stats['cost'],
                'budget': dev_stats['budget'],
                'agent_count': dev_stats['seats_count'],
                'gross_value': dev_stats['gross_value'],
                'hours_saved': dev_stats['hours_saved'],
                'is_seat_license': True
            }

    m365_stats = get_m365_summary(effective_function)
    for dept_name, d_info in m365_stats.get('department_breakdown', {}).items():
        team_name = f'Microsoft 365 Copilot ({dept_name})'
        teams_map[team_name] = {
            'team': team_name,
            'function': dept_name,
            'cost': d_info['cost'],
            'budget': d_info['budget'],
            'agent_count': d_info['seats'],
            'gross_value': d_info['gross_value'],
            'hours_saved': d_info['hours_saved'],
            'is_seat_license': True
        }

    team_costs = list(teams_map.values())
    for tc in team_costs:
        tc['cost'] = round(tc['cost'], 2)
        tc['budget'] = round(tc['budget'], 2)
        tc['variance'] = round(tc['cost'] - tc['budget'], 2)
        tc['variance_pct'] = round((tc['cost'] / tc['budget'] * 100.0) if tc['budget'] > 0 else 0.0, 1)
        tc['gross_value'] = round(tc.get('gross_value', 0.0), 2)
        tc['net_value'] = round(tc['gross_value'] - tc['cost'], 2)

    team_costs.sort(key=lambda x: x['cost'], reverse=True)
    return team_costs

def get_unified_trend(effective_function: Optional[str] = None, cohort: Optional[str] = 'enterprise') -> List[Dict[str, Any]]:
    summary = get_unified_summary(None, effective_function, cohort=cohort)
    current_net = summary['total_net_value']
    current_gross = summary['total_gross_value']
    current_cost = summary['total_cost']
    current_count = summary['active_agents']

    trajectory_ratios = [0.45, 0.58, 0.70, 0.82, 0.92, 1.00]
    months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']

    results = []
    for m, ratio in zip(months, trajectory_ratios):
        g = round(current_gross * ratio, 2)
        c = round(current_cost * (0.85 + ratio * 0.15), 2)
        n = round(g - c, 2)
        roi = round(g / c, 2) if c > 0 else 0.0
        results.append({
            'month': m,
            'net_value': n,
            'gross_value': g,
            'cost': c,
            'roi': roi,
            'agent_count': current_count
        })
    return results