import json
import os
from typing import List, Dict, Any, Optional
from .database import (
    query_all,
    get_thresholds_from_db,
    update_thresholds_in_db
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "mock_data.json")

class CockpitDataStore:
    def __init__(self):
        self._default_thresholds = {
            "experiment_days": 60,
            "intervene_eval_pass": 88.0,
            "intervene_cost_budget_pct": 110.0,
            "intervene_value_min": 15000.0,
            "accelerate_value_min": 40000.0,
            "accelerate_adoption_min": 70.0,
        }
        self.load_data()

    @property
    def thresholds(self) -> Dict[str, Any]:
        try:
            db_thresholds = get_thresholds_from_db()
            if db_thresholds:
                return db_thresholds
        except Exception:
            pass
        return self._default_thresholds

    @thresholds.setter
    def thresholds(self, val: Dict[str, Any]):
        self._default_thresholds.update(val)
        try:
            update_thresholds_in_db(val)
        except Exception:
            pass

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

        current_thresh = self.thresholds

        # 1. EXPERIMENT: days in prod < 60
        if days < current_thresh["experiment_days"]:
            return "experiment", "Pilot ramp & gather early telemetry"
            
        # 2. INTERVENE:
        budget_pct = (cost / budget * 100.0) if budget > 0 else 0.0
        if (runs > 0 and eval_pass_rate < current_thresh["intervene_eval_pass"]) or \
           (budget > 0 and budget_pct > current_thresh["intervene_cost_budget_pct"]) or \
           (net_val < current_thresh["intervene_value_min"]) or \
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
        if net_val >= current_thresh["accelerate_value_min"] and adoption >= current_thresh["accelerate_adoption_min"]:
            return "accelerate", "Scale deployment to other business units"
            
        # 4. OPTIMIZE: everything else
        return "optimize", "Refine latency, caching & fine-tuning"

    def get_months(self) -> List[str]:
        try:
            rows = query_all("SELECT DISTINCT substr(month_start, 1, 7) AS m FROM v_agent_scorecard_monthly ORDER BY m ASC")
            if rows:
                return [r["m"] for r in rows]
        except Exception:
            pass
        return sorted(list(set(a["Month"] for a in self.raw_agents)))

    def get_functions(self) -> List[str]:
        try:
            rows = query_all("SELECT DISTINCT name FROM business_function ORDER BY name ASC")
            if rows:
                return [r["name"] for r in rows]
        except Exception:
            pass
        return sorted(list(set(a["Function"] for a in self.raw_agents)))

    def get_processed_agents(self, month: Optional[str] = None, function_name: Optional[str] = None) -> List[Dict[str, Any]]:
        target_month = month or (self.get_months()[-1] if self.get_months() else "2026-09")
        
        # 1. Try querying SQLite view v_agent_scorecard_monthly
        try:
            sql = "SELECT * FROM v_agent_scorecard_monthly WHERE substr(month_start, 1, 7) = ?"
            params = [target_month]
            if function_name:
                sql += " AND function_name = ?"
                params.append(function_name)
            
            rows = query_all(sql, tuple(params))
            if rows:
                results = []
                for r in rows:
                    name = r.get("agent_name", "")
                    agent_id = name.lower().replace(" ", "-").replace("&", "and")
                    action = (r.get("action_label") or "optimize").lower()
                    
                    # Compute suggested action recommendation string
                    incidents = int(r.get("incident_count") or 0)
                    eval_p = float(r.get("eval_pass_rate") or 0)
                    runs = int(r.get("eval_cases") or 0)
                    cost_budget_pct = float(r.get("cost_vs_budget_pct") or 0)
                    net_val = float(r.get("net_value") or 0)

                    if action == "experiment":
                        suggested = "Pilot ramp & gather early telemetry"
                    elif action == "accelerate":
                        suggested = "Scale deployment to other business units"
                    elif action == "intervene":
                        if incidents > 0:
                            suggested = "Immediate safety guardrails review"
                        elif runs > 0 and eval_p < 85:
                            suggested = "Tune prompts & update golden eval dataset"
                        elif cost_budget_pct > 115:
                            suggested = "Review token consumption & caching"
                        elif net_val < 10000:
                            suggested = "Re-assess scope and workflow fit"
                        else:
                            suggested = "Underperforming: investigate root cause"
                    else:
                        suggested = "Refine latency, caching & fine-tuning"

                    licensed = int(r.get("licensed_users") or r.get("assigned_seats") or 0)
                    active = int(r.get("active_users") or 0)
                    adoption = float(r.get("adoption_pct") or 0)

                    results.append({
                        "id": agent_id,
                        "name": name,
                        "team": r.get("team_name", ""),
                        "function": r.get("function_name", ""),
                        "in_portfolio": r.get("portfolio") != "None",
                        "gross_value": round(float(r.get("gross_value") or 0), 2),
                        "cost": round(float(r.get("total_cost") or 0), 2),
                        "budget": round(float(r.get("budget") or 0), 2),
                        "net_value": round(float(r.get("net_value") or 0), 2),
                        "hours_saved": round(float(r.get("hours_saved") or 0), 1),
                        "active_users": active,
                        "licensed_users": licensed,
                        "adoption_pct": round(adoption, 1),
                        "eval_runs": runs,
                        "eval_passed": int(r.get("eval_passed_cases") or 0),
                        "eval_pass_rate": round(eval_p, 1),
                        "policy_incidents": incidents,
                        "days_in_production": int(r.get("days_in_prod_at_month_end") or 0),
                        "action": action,
                        "suggested_action": suggested,
                    })
                return results
        except Exception as e:
            # Fallback if database query fails
            pass

        # 2. Fallback to raw_agents in-memory
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
