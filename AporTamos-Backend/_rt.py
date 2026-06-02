from dotenv import load_dotenv; load_dotenv()
import os, psycopg2
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

cur.execute("SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' ORDER BY tablename;")
print('En supabase_realtime:', [r[0] for r in cur.fetchall()])

cur.execute("""
SELECT relname, relreplident FROM pg_class
WHERE relname IN ('chat_messages','task_assignments') AND relkind='r';
""")
# relreplident: 'd'=default, 'f'=full, 'n'=nothing, 'i'=index
for name, ident in cur.fetchall():
    print(f'{name}: replica_identity={ident}  ({"FULL" if ident=="f" else "NOT full"})')

cur.close(); conn.close()
