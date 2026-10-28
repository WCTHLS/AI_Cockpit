import json
import os
from typing import List, Dict, Any, Optional
from .database import (
    query_all,
    query_one,
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
                # Only real streams: Antigravity IDE and M365 Copilot (No 4,600 dummy mock seats)
                self.raw_seats = [
                    ["Eng & IT", "Antigravity IDE", 0, 1]
                ]
        else:
            self.raw_agents = []
            self.raw_costs = []
            self.raw_seats = [
                ["Eng & IT", "Antigravity IDE", 0, 1]
            ]

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
        return ["2026-09", "2026-10"]

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
            results = []
            for r in rows:
                name = r.get("agent_name", "")
                agent_id = name.lower().replace(" ", "-").replace("&", "and")
                db_agent_id = r.get("agent_id") or 11
                
                # ── 1. ADOPTION RATE: (employees using agent / employees assigned to agent) * 100 ──
                assigned_row = query_one(
                    "SELECT COUNT(DISTINCT employee_id) as cnt FROM employee_agent WHERE agent_id = ? AND is_active = 1",
                    (db_agent_id,)
                )
                assigned_count = assigned_row["cnt"] if assigned_row and assigned_row["cnt"] > 0 else 0

                if assigned_count == 0 and r.get("team_id"):
                    team_cnt_row = query_one("SELECT COUNT(*) as cnt FROM employee WHERE team_id = ? AND is_active = 1", (r["team_id"],))
                    assigned_count = team_cnt_row["cnt"] if team_cnt_row and team_cnt_row["cnt"] > 0 else 0

                if assigned_count == 0:
                    assigned_count = int(r.get("licensed_users") or r.get("assigned_seats") or 4)

                using_row = query_one(
                    "SELECT COUNT(DISTINCT employee_id) as cnt FROM user_usage WHERE agent_id = ?",
                    (db_agent_id,)
                )
                using_count = using_row["cnt"] if using_row and using_row["cnt"] > 0 else 0
                if using_count == 0:
                    using_count = int(r.get("active_users") or 0)

                adoption = round((using_count / assigned_count) * 100.0, 1) if assigned_count > 0 else 0.0

                # ── 2. EVAL PASS: AVG SUCCESS RATE (ALL USERS) ──
                usage_agg = query_all(
                    "SELECT daily_usage_json, sessions_count FROM user_usage WHERE agent_id = ?",
                    (db_agent_id,)
                )
                tot_sessions = 0
                tot_success = 0
                tot_prompt_tokens = 0
                tot_completion_tokens = 0
                for ur in usage_agg:
                    try:
                        parsed = json.loads(ur["daily_usage_json"])
                        tot_sessions += int(parsed.get("session_count", ur["sessions_count"]))
                        tot_success += int(parsed.get("sucess", 0))
                        tot_prompt_tokens += int(parsed.get("prompt_tokens", 0))
                        tot_completion_tokens += int(parsed.get("completion_tokens", 0))
                    except Exception:
                        pass

                if tot_sessions > 0:
                    eval_p = round((tot_success / tot_sessions) * 100.0, 1)
                    runs = tot_sessions
                    eval_passed = tot_success
                else:
                    runs = int(r.get("eval_cases") or 0)
                    eval_passed = int(r.get("eval_passed_cases") or 0)
                    eval_p = float(r.get("eval_pass_rate") or 0.0)

                # ── 3. PRODUCTIVITY & FINANCIALS (Using working agent configuration) ──
                incidents = int(r.get("incident_count") or 0)

                # Fetch agent's specific onboarding configuration from ai_agent table
                agent_cfg = query_one("""
                    SELECT 
                        monthly_infra_cost, monthly_budget, input_token_price_per_1m, output_token_price_per_1m,
                        baseline_employee_hours, employee_monthly_rate, employee_monthly_working_hours
                    FROM ai_agent WHERE id = ?
                """, (db_agent_id,))

                baseline_hrs_cfg = float(agent_cfg.get("baseline_employee_hours") or 0.5) if agent_cfg else 0.5
                emp_monthly_rate_cfg = float(agent_cfg.get("employee_monthly_rate") or 6500.0) if agent_cfg else 6500.0
                working_hours_cfg = float(agent_cfg.get("employee_monthly_working_hours") or 160.0) if agent_cfg else 160.0
                monthly_infra_cfg = float(agent_cfg.get("monthly_infra_cost") or 0.0) if agent_cfg else 0.0
                monthly_budget_cfg = float(agent_cfg.get("monthly_budget") or 500.0) if agent_cfg else 500.0
                input_price_cfg = float(agent_cfg.get("input_token_price_per_1m") or 2.50) if agent_cfg else 2.50
                output_price_cfg = float(agent_cfg.get("output_token_price_per_1m") or 10.00) if agent_cfg else 10.00

                # 3A. Hours Saved
                if tot_success > 0:
                    hours_saved = round(tot_success * baseline_hrs_cfg, 1)
                else:
                    hours_saved = float(r.get("hours_saved") or 0.0)

                # 3B. Hourly labor rate = employee_monthly_rate / employee_monthly_working_hours
                if emp_monthly_rate_cfg > 0 and working_hours_cfg > 0:
                    hourly_rate = round(emp_monthly_rate_cfg / working_hours_cfg, 2)
                else:
                    hourly_rate = float(r.get("hourly_cost") or 40.63)

                # 3C. Gross Labor Value Created
                gross_val = round(hours_saved * hourly_rate, 2)

                # 3D. Monthly Actual AI Cost = sum of tokens usage cost + monthly infra cost (no seats for custom agents)
                if tot_prompt_tokens > 0 or tot_completion_tokens > 0:
                    token_cost = (tot_prompt_tokens * input_price_cfg / 1_000_000.0) + (tot_completion_tokens * output_price_cfg / 1_000_000.0)
                else:
                    token_cost = float(r.get("total_cost") or 0.0)

                cost = round(token_cost + monthly_infra_cfg, 2)

                # 3E. Monthly Budget and Net Value Delivered
                budget = round(monthly_budget_cfg if monthly_budget_cfg > 0 else float(r.get("budget") or 500.0), 2)
                net_val = round(gross_val - cost, 2)
                cost_budget_pct = round((cost / budget * 100.0), 1) if budget > 0 else 0.0

                # ── 4. STATUS & GOVERNANCE ACTION ──
                if incidents > 0:
                    action = "intervene"
                    suggested = "Immediate safety guardrails review"
                elif runs > 0 and eval_p < 80:
                    action = "intervene"
                    suggested = "Tune prompts & update golden eval dataset"
                elif cost_budget_pct > 115:
                    action = "intervene"
                    suggested = "Review token consumption & caching"
                elif net_val >= 100 and adoption >= 70:
                    action = "accelerate"
                    suggested = f"High adoption ({adoption}%) and {eval_p}% user resolution rate. Scale rollout."
                else:
                    action = "optimize"
                    suggested = "Refine latency, caching & fine-tuning"

                results.append({
                    "id": agent_id,
                    "name": name,
                    "team": r.get("team_name", ""),
                    "function": r.get("function_name", ""),
                    "in_portfolio": r.get("portfolio") != "None",
                    "gross_value": gross_val,
                    "cost": cost,
                    "budget": budget,
                    "net_value": net_val,
                    "hours_saved": hours_saved,
                    "active_users": using_count,
                    "licensed_users": assigned_count,
                    "adoption_pct": adoption,
                    "eval_runs": runs,
                    "eval_passed": eval_passed,
                    "eval_pass_rate": eval_p,
                    "policy_incidents": incidents,
                    "days_in_production": int(r.get("days_in_prod_at_month_end") or 0),
                    "action": action,
                    "suggested_action": suggested,
                })
            return results
        except Exception as e:
            pass
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
