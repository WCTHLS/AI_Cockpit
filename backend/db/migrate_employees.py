import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "cockpit.db"))
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Create employee_agent table if it doesn't exist
cur.execute("""
CREATE TABLE IF NOT EXISTS employee_agent (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    agent_id        INTEGER NOT NULL REFERENCES ai_agent(id) ON DELETE CASCADE,
    assigned_from   TEXT NOT NULL DEFAULT (date('now')),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id, company_id) REFERENCES employee(id, company_id),
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    UNIQUE(employee_id, agent_id)
);
""")
cur.execute("CREATE INDEX IF NOT EXISTS idx_employee_agent_emp ON employee_agent(employee_id, agent_id);")

# 2. Get team IDs
cur.execute("SELECT id, name FROM team WHERE company_id = 1;")
teams = {row[1]: row[0] for row in cur.fetchall()}
print("Loaded teams:", teams)

# Team distribution mapping for the 15 employees
# Keeping 4 (at least 3) in IT Service Desk, and distributing across Eng & IT and Customer
distribution = {
    # IT Service Desk (Eng & IT) - 4 employees
    "aarav@wct.com": ("Aarav Sharma", teams.get("IT Service Desk", 5)),
    "ananya@wct.com": ("Ananya Rao", teams.get("IT Service Desk", 5)),
    "arjun@wct.com": ("Arjun Patel", teams.get("IT Service Desk", 5)),
    "divya@wct.com": ("Divya Nair", teams.get("IT Service Desk", 5)),

    # Software Engineering (Eng & IT) - 3 employees
    "imran@wct.com": ("Imran Khan", teams.get("Software Engineering", 6)),
    "karthik@wct.com": ("Karthik Raman", teams.get("Software Engineering", 6)),
    "kavya@wct.com": ("Kavya Sen", teams.get("Software Engineering", 6)),

    # DevOps & SRE (Eng & IT) - 2 employees
    "meera@wct.com": ("Meera Joshi", teams.get("DevOps & SRE", 7)),
    "neha@wct.com": ("Neha Gupta", teams.get("DevOps & SRE", 7)),

    # Device Engineering (Eng & IT) - 1 employee
    "priya@wct.com": ("Priya Sharma", teams.get("Device Engineering", 8)),

    # Customer Service (Customer) - 2 employees
    "rahul@wct.com": ("Rahul Varma", teams.get("Customer Service", 1)),
    "rohan@wct.com": ("Rohan Kapoor", teams.get("Customer Service", 1)),

    # Product Support (Customer) - 1 employee
    "siddharth@wct.com": ("Siddharth Roy", teams.get("Product Support", 2)),

    # Warranty & Returns (Customer) - 1 employee
    "sneha@wct.com": ("Sneha Reddy", teams.get("Warranty & Returns", 3)),

    # Field Services (Customer) - 1 employee
    "vikram@wct.com": ("Vikram Das", teams.get("Field Services", 4)),
}

for email, (full_name, team_id) in distribution.items():
    cur.execute("""
        UPDATE employee 
        SET display_name = ?, team_id = ?
        WHERE email = ?;
    """, (full_name, team_id, email))
    print(f"Updated {email} -> {full_name} in team_id {team_id}")

# 3. Find Ticket Triage Agent ID
cur.execute("SELECT id FROM ai_agent WHERE name = 'Ticket Triage Agent';")
row = cur.fetchone()
if not row:
    cur.execute("""
        INSERT INTO ai_agent (company_id, name, category, agent_type, portfolio, go_live_date, is_active)
        VALUES (1, 'Ticket Triage Agent', 'built_with', 'workflow_agent', 'Default', '2026-01-01', 1);
    """)
    agent_id = cur.lastrowid
else:
    agent_id = row[0]

# 4. Map employees to agents in employee_agent table
# Assign IT Service Desk employees to Ticket Triage Agent
cur.execute("SELECT id, display_name, email, team_id FROM employee WHERE team_id = ?;", (teams.get("IT Service Desk", 5),))
it_desk_employees = cur.fetchall()
print(f"\nAssigning {len(it_desk_employees)} IT Service Desk employees to agent_id {agent_id}:")
for emp in it_desk_employees:
    emp_id = emp[0]
    cur.execute("""
        INSERT OR REPLACE INTO employee_agent 
        (company_id, employee_id, agent_id, assigned_from, is_active)
        VALUES (1, ?, ?, '2026-01-01', 1);
    """, (emp_id, agent_id))
    print(f"  Mapped Employee #{emp_id} ({emp[1]}) -> Agent #{agent_id}")

conn.commit()

print("\n--- Verification: Employees in IT Service Desk with Assigned Agents ---")
cur.execute("""
SELECT e.id, e.display_name, e.email, t.name as team_name, f.name as function_name, a.name as agent_name
FROM employee e
JOIN team t ON t.id = e.team_id
JOIN business_function f ON f.id = t.function_id
LEFT JOIN employee_agent ea ON ea.employee_id = e.id AND ea.is_active = 1
LEFT JOIN ai_agent a ON a.id = ea.agent_id
WHERE t.name = 'IT Service Desk';
""")
for r in cur.fetchall():
    print(" ", r)

print("\n--- Summary of Employees by Team ---")
cur.execute("""
SELECT t.name, f.name, COUNT(e.id) as emp_count, GROUP_CONCAT(e.display_name)
FROM team t
JOIN business_function f ON f.id = t.function_id
LEFT JOIN employee e ON e.team_id = t.id
WHERE f.name IN ('Eng & IT', 'Customer')
GROUP BY t.id
HAVING emp_count > 0;
""")
for r in cur.fetchall():
    print(f"  [{r[1]}] {r[0]}: {r[2]} employees ({r[3]})")

conn.close()
