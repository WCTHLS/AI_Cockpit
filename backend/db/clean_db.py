import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "cockpit.db"))
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("PRAGMA foreign_keys = OFF;")

# Tables to clear (dummy facts and metrics)
tables_to_clear = [
    "value_measurement_month",
    "cost_record",
    "agent_budget_month",
    "agent_seat_month",
    "agent_evaluation",
    "agent_incident",
    "agent_usage_daily",
    "seat_inventory_item",
    "agent_run",
    "ingestion_batch",
    "data_source"
]

for t in tables_to_clear:
    cur.execute(f"DELETE FROM {t};")
    print(f"Cleared table: {t}")

# Clear dummy agents, keeping only the Ticket Triage Agent (IT Assistant)
cur.execute("DELETE FROM team_agent WHERE agent_id NOT IN (SELECT id FROM ai_agent WHERE name = 'Ticket Triage Agent');")
cur.execute("DELETE FROM ai_agent WHERE name != 'Ticket Triage Agent';")

# Ensure Ticket Triage Agent is assigned to IT Service Desk team
cur.execute("SELECT id FROM ai_agent WHERE name = 'Ticket Triage Agent';")
agent_row = cur.fetchone()
if agent_row:
    agent_id = agent_row[0]
    cur.execute("SELECT id FROM team WHERE name = 'IT Service Desk';")
    team_row = cur.fetchone()
    team_id = team_row[0] if team_row else 5
    cur.execute("DELETE FROM team_agent WHERE agent_id = ?;", (agent_id,))
    cur.execute("""
        INSERT INTO team_agent (company_id, team_id, agent_id, assigned_from, is_active)
        VALUES (1, ?, ?, '2026-01-01', 1);
    """, (team_id, agent_id))

conn.commit()
cur.execute("PRAGMA foreign_keys = ON;")

print("\n--- Preserved & Active Table Counts in cockpit.db ---")
check_tables = [
    "company",
    "business_function",
    "team",
    "team_hourly_cost_rate",
    "employee",
    "ai_agent",
    "team_agent",
    "config_threshold",
    "value_measurement_month",
    "cost_record",
    "agent_budget_month",
    "agent_seat_month",
    "agent_evaluation",
    "agent_incident",
    "agent_usage_daily",
    "seat_inventory_item"
]

for t in check_tables:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    print(f"  {t}: {cur.fetchone()[0]}")

conn.close()
