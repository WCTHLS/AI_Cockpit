
from app.database import get_db
with get_db() as conn:
    conn.execute('''
        INSERT INTO developer_seats (
            developer_id, developer_name, developer_email, department, role,
            provider, license_tier, editor, status, sessions_count,
            prompts_count, suggestions_generated, suggestions_accepted,
            acceptance_rate_pct, hours_saved, last_active_at, updated_at
        ) VALUES (
            'nivas@gmail.com', 'Nivas', 'nivas@gmail.com', 'Eng & IT', 'Software Engineer',
            'gemini_antigravity', 'Antigravity Enterprise', 'Antigravity IDE', 'ACTIVE',
            25, 1005, 12213, 11651,
            95.4, 69.9, '2026-10-27T07:55:44.566464+00:00', '2026-10-27T07:55:44.566464+00:00'
        )
        ON CONFLICT(developer_id) DO UPDATE SET
            developer_name = excluded.developer_name,
            developer_email = excluded.developer_email,
            sessions_count = excluded.sessions_count,
            prompts_count = excluded.prompts_count,
            suggestions_generated = excluded.suggestions_generated,
            suggestions_accepted = excluded.suggestions_accepted,
            hours_saved = excluded.hours_saved,
            last_active_at = excluded.last_active_at,
            updated_at = excluded.updated_at
    ''')
    conn.commit()
print('Successfully registered Nivas in Docker DB!')
