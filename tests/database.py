"""Run against a disposable PostgreSQL database ONLY, bootstrapped with the local fixture.
TASCA_TEST_DATABASE_URL=postgresql://localhost:55439/postgres python3 tests/database.py
Never use production: these tests create fixture financial records.
"""
import json,os,subprocess,unittest
from concurrent.futures import ThreadPoolExecutor
URL=os.environ['TASCA_TEST_DATABASE_URL']
if 'localhost:55439/' not in URL and '127.0.0.1:55439/' not in URL:raise SystemExit('Only the disposable local test database on port 55439 is allowed.')
A='11111111-1111-4111-8111-111111111111';B='22222222-2222-4222-8222-222222222222';C='33333333-3333-4333-8333-333333333333';U='44444444-4444-4444-8444-444444444444'
def sql(s,u=A,fail=False,role='authenticated'):
 q=f"set role {role};set request.jwt.claim.sub='{u}';"+s
 p=subprocess.run(['psql',URL,'-X','-qAt','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True)
 if fail:
  if p.returncode==0:raise AssertionError('Unauthorized operation succeeded: '+s)
  if 'ERROR:' not in p.stderr:raise AssertionError('Test infrastructure failed: '+p.stderr)
  return p.stderr
 if p.returncode:raise AssertionError(p.stderr)
 return json.loads(p.stdout.strip()) if p.stdout.strip() else None
def mutate(kind,v,u=A,fail=False):return sql("select public.tasca_mutate('"+kind+"',$json$"+json.dumps(v)+"$json$::jsonb);",u,fail)
def snapshot(u=A):return sql('select public.tasca_snapshot();',u)
def account(ident,u=A):return mutate('planning',dict(action='account',id=ident,name=ident,opening=10000,opening_date='2024-01-01'),u)
def movement(ident,a='shared',u=A,**extras):return mutate('finance',dict(id=ident,type='expense',amount=1000,category='Casa',description='Spesa',date='2024-03-01',account_id=a,**extras),u)
class Access(unittest.TestCase):
 def test_journey(self):
  sql('select public.tasca_snapshot();','',True,'anon')
  sql('select public.tasca_snapshot();','',True)
  sql('select public.tasca_snapshot();',U,True)
  sql('select * from tasca.accounts;',A,True)
  sql("select tasca.can_access('shared',auth.uid());",A,True)
  account('private');account('shared');account('b-private',B)
  self.assertEqual(len(snapshot(B)['accounts']),1)
  mutate('planning',dict(action='account',id='private',name='stolen',opening=0,opening_date='2024-01-01'),B,True)
  movement('a-private','private');movement('shared-spend')
  movement('no-account','',A,author='Fake',owner_id=B)
  self.assertEqual(snapshot(B)['movements'],[])
  token=mutate('sharing',dict(action='invite',account_id='shared'))['token']
  mutate('sharing',dict(action='accept',token=token),B)
  mutate('sharing',dict(action='accept',token=token),C,True)
  self.assertEqual([m['id'] for m in snapshot(B)['movements']],['shared-spend'])
  movement('bob-spend','shared',B,author='Fake',owner_id=A)
  m=next(x for x in snapshot(A)['movements'] if x['id']=='bob-spend');self.assertEqual(m['author'],'Bob');self.assertEqual(m['owner_id'],B)
  mutate('finance',dict(id='bob-spend',type='expense',amount=900,category='Casa',description='Edited',date='2024-03-01',account_id='shared'),A)
  m=next(x for x in snapshot(B)['movements'] if x['id']=='bob-spend');self.assertEqual(m['author'],'Bob');self.assertEqual(m['updated_by'],'Alice')
  mutate('finance',dict(id='a-private',type='expense',amount=5,category='Casa',description='Steal',date='2024-03-01',account_id='shared'),B,True)
  mutate('finance',dict(id='shared-spend',type='expense',amount=5,category='Casa',description='Move',date='2024-03-01',account_id='b-private'),B,True)
  mutate('finance',dict(id='transfer',type='transfer',amount=500,category='Trasferimento',description='Transfer',date='2024-03-01',account_id='private',to_account_id='shared'))
  tr=next(x for x in snapshot(B)['movements'] if x['id']=='transfer');self.assertIsNone(tr['account_id']);self.assertFalse(tr['can_edit'])
  mutate('finance',dict(action='delete',id='transfer'),B,True)
  mutate('finance',dict(action='budget',month='2024-03',amount=50000))
  self.assertEqual(snapshot(B)['budgets'],[])
  mutate('finance',dict(id='negative',type='expense',amount=-1,description='Bad',category='Casa',date='2024-03-01',account_id='shared'),A,True)
  mutate('finance',dict(id='early',type='expense',amount=1,description='Bad',category='Casa',date='2023-03-01',account_id='shared'),A,True)
  mutate('planning',dict(action='recurring',id='rent',type='expense',amount=900,category='Casa',description='Rent',account_id='shared',start_date='2024-01-31',end_date=None,active=1))
  mutate('planning',dict(action='confirm',id='rent',date='2024-02-28'),B,True)
  mutate('planning',dict(action='confirm',id='rent',date='2024-02-29'),B)
  mutate('planning',dict(action='confirm',id='rent',date='2024-02-29'),A)
  self.assertEqual(len([x for x in snapshot(A)['movements'] if x['id']=='rec:rent:2024-02-29']),1)
  mutate('finance',dict(action='delete',id='rec:rent:2024-02-29'),A)
  mutate('planning',dict(action='confirm',id='rent',date='2024-02-29'),B)
  self.assertFalse(any(x['id']=='rec:rent:2024-02-29' for x in snapshot(A)['movements']))
  mutate('planning',dict(action='skip',id='rent',date='2024-03-31'),A)
  mutate('planning',dict(action='confirm',id='rent',date='2024-03-31'),B)
  self.assertFalse(any(x['id']=='rec:rent:2024-03-31' for x in snapshot(A)['movements']))
  mutate('sharing',dict(action='invite',account_id='shared'),B,True)
  token=mutate('sharing',dict(action='invite',account_id='shared'))['token']
  mutate('sharing',dict(action='revoke',account_id='shared'))
  mutate('sharing',dict(action='accept',token=token),C,True)
  mutate('sharing',dict(action='remove',account_id='shared',email='bob@example.test'))
  self.assertEqual(snapshot(B)['movements'],[])
  mutate('planning',dict(action='confirm',id='rent',date='2024-04-30'),B,True)
  mutate('finance',dict(action='delete',id='bob-spend'),B,True)
  self.assertEqual(snapshot(C)['accounts'],[])
  with ThreadPoolExecutor(max_workers=2) as pool:
   list(pool.map(lambda _: mutate('planning',dict(action='confirm',id='rent',date='2024-04-30')),range(2)))
  self.assertEqual(len([x for x in snapshot(A)['movements'] if x['id']=='rec:rent:2024-04-30']),1)
  mutate('finance',dict(id='rec:fake:2024-05-01',type='expense',amount=1,description='Fake recurrence',category='Casa',date='2024-05-01',account_id='shared'),A,True)
  token=mutate('sharing',dict(action='invite',account_id='shared'))['token']
  subprocess.run(['psql',URL,'-X','-qAt','-v','ON_ERROR_STOP=1','-c',"update tasca.invites set expires_at=now()-interval '1 minute' where used_by is null;"],check=True,capture_output=True)
  mutate('sharing',dict(action='accept',token=token),C,True)
if __name__=='__main__':unittest.main()
