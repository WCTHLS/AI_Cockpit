import json
import os
from typing import List, Dict, Any, Optional

DATA_PATH = os.path.join(os.path.dirname(__file__), "mock_data.json")

class CockpitDataStore:
    def __init__(self):
        self.thresholds = {
            "experiment_days": 60,
            "intervene_eval_pass": 88.0,
            "intervene_cost_budget_pct": 110.0,
            "intervene_value_min": 15000.0,
            "accelerate_value_min": 40000.0,
            "accelerate_adoption_min": 70.0,
        }
        self.load_data()

    def load_data(self):
        if os.path.exists(DATA_PATH):
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                raw = json.load(f)
                self.raw_agents = raw.get("agents", [])
                self.raw_costs = raw.get("costs", [])
                self.raw_seats = raw.get("seats", [])
        else:
            self.raw_agents = []
            self.raw_costs = []
            self.raw_seats = []

    def compute_action(self, agent_row: Dict[str, Any]) -> tuple[str, str]:
        days = agent_row.get("DaysInProduction", 0)
        runs = agent_row.get("EvalRuns", 0)
        passed = agent_row.get("EvalPassed", 0)
        eval_pass_rate = (passed / runs * 100.0) if runs > 0 else 0.0
        cost = agent_row.get("CostUSD", 0)
        budget = agent_row.get("BudgetUSD", 0)
        net_val = agent_row.get("NetValueUSD", 0)
        incidents = agent_row.get("PolicyIncidents", 0)
        
        licensed = agent_row.get("LicensedUsers", 0)
        active = agent_row.get("ActiveUsers", 0)
        adoption = (active / licensed * 100.0) if licensed > 0 else 0.0

        # Decision Tree (PPTX Slide 7):
        # 1. EXPERIMENT: days in prod < 60
        if days < self.thresholds["experiment_days"]:
            return "experiment", "Pilot ramp & gather early telemetry"
            
        # 2. INTERVENE:
        # eval pass < 88% OR cost > 110% budget OR net value < $15k OR incidents > 0
        budget_pct = (cost / budget * 100.0) if budget > 0 else 0.0
        if (runs > 0 and eval_pass_rate < self.thresholds["intervene_eval_pass"]) or \
           (budget > 0 and budget_pct > self.thresholds["intervene_cost_budget_pct"]) or \
           (net_val < self.thresholds["intervene_value_min"]) or \
           (incidents > 0):
            if incidents > 0:
                return "intervene", "Immediate safety guardrails review"
            elif runs > 0 and eval_pass_rate < 85:
                return "intervene", "Tune prompts & update golden eval dataset"
            elif budget_pct > 115:
                return "intervene", "Review token consumption & caching"
            elif net_val < 10000:
                return "intervene", "Re-assess scope and workflow fit"
            return "intervene", "Underperforming: investigate root cause"
            
        # 3. ACCELERATE: net value >= $40k AND adoption >= 70%
        if net_val >= self.thresholds["accelerate_value_min"] and adoption >= self.thresholds["accelerate_adoption_min"]:
            return "accelerate", "Scale deployment to other business units"
            
        # 4. OPTIMIZE: everything else
        return "optimize", "Refine latency, caching & fine-tuning"

    def get_months(self) -> List[str]:
        return sorted(list(set(a["Month"] for a in self.raw_agents)))

    def get_functions(self) -> List[str]:
        return sorted(list(set(a["Function"] for a in self.raw_agents)))

    def get_processed_agents(self, month: Optional[str] = None, function_name: Optional[str] = None) -> List[Dict[str, Any]]:
        target_month = month or (self.get_months()[-1] if self.get_months() else "2026-09")
        results = []
        for a in self.raw_agents:
            if a.get("Month") != target_month:
                continue
            if function_name and a.get("Function") != function_name:
                continue
                
            action, suggested = self.compute_action(a)
            runs = a.get("EvalRuns", 0)
            passed = a.get("EvalPassed", 0)
            eval_p = (passed / runs * 100.0) if runs > 0 else 0.0
            licensed = a.get("LicensedUsers", 0)
            active = a.get("ActiveUsers", 0)
            adoption = (active / licensed * 100.0) if licensed > 0 else 0.0
            
            # create stable agent slug/id
            name = a.get("Agent", "")
            agent_id = name.lower().replace(" ", "-").replace("&", "and")

            results.append({
                "id": agent_id,
                "name": name,
                "team": a.get("Team", ""),
                "function": a.get("Function", ""),
                "in_portfolio": a.get("InPortfolio") == "Yes",
                "gross_value": float(a.get("GrossValueUSD", 0)),
                "cost": float(a.get("CostUSD", 0)),
                "budget": float(a.get("BudgetUSD", 0)),
                "net_value": float(a.get("NetValueUSD", 0)),
                "hours_saved": float(a.get("HoursSaved", 0)),
                "active_users": int(active),
                "licensed_users": int(licensed),
                "adoption_pct": round(adoption, 1),
                "eval_runs": int(runs),
                "eval_passed": int(passed),
                "eval_pass_rate": round(eval_p, 1),
                "policy_incidents": int(a.get("PolicyIncidents", 0)),
                "days_in_production": int(a.get("DaysInProduction", 0)),
                "action": action,
                "suggested_action": suggested,
            })
        return results

store = CockpitDataStore()
