#!/usr/bin/env python3
"""Online SQLite backup + isolated restoration verification. Never restores active DB."""
import argparse,sqlite3,pathlib,datetime,hashlib,json,os
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--source',default='prisma/dev.db');p.add_argument('--directory',default='verification/backups');args=p.parse_args()
source=(root/args.source).resolve();directory=(root/args.directory).resolve()
if not source.is_file() or source.suffix!='.db': raise SystemExit('SQLite source must exist')
if not directory.is_relative_to(root/'verification'):raise SystemExit('Backups must remain in local verification directory')
directory.mkdir(parents=True,exist_ok=True)
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
backup=directory/('sqlite-'+stamp+'.db');restore=directory/('restore-check-'+stamp+'.db')
def exclusive(path):
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600);os.close(fd)
def snapshot(connection):
 tables=[row[0] for row in connection.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")]
 result={}
 for table in tables:
  digest=hashlib.sha256()
  digest.update(b'[')
  count=0
  quoted=table.replace('"','""')
  for row in connection.execute('select * from "'+quoted+'" order by rowid'):
   if count: digest.update(b', ')
   digest.update(repr(row).encode())
   count+=1
  digest.update(b']')
  result[table]={'count':count,'digest':digest.hexdigest()}
 return result
exclusive(backup)
with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as s,sqlite3.connect(backup) as b:
 s.backup(b)
 if b.execute('pragma integrity_check').fetchall()!=[('ok',)] or b.execute('pragma foreign_key_check').fetchall():raise SystemExit('Invalid backup')
 before=snapshot(b)
exclusive(restore)
with sqlite3.connect(backup.as_uri()+'?mode=ro',uri=True) as b,sqlite3.connect(restore) as r:
 b.backup(r);r.execute('pragma foreign_keys=ON')
 integrity=r.execute('pragma integrity_check').fetchall();fk=r.execute('pragma foreign_key_check').fetchall();after=snapshot(r)
 if before!=after or integrity!=[('ok',)] or fk: raise SystemExit('Invalid restored backup')
report={'backup':str(backup.relative_to(root)),'isolatedRestore':str(restore.relative_to(root)),'integrity':integrity,'foreignKeys':fk,'allTablesAndContentsEqual':before==after,'tables':after}
( directory/('verification-'+stamp+'.json')).write_text(json.dumps(report,indent=2));print(json.dumps(report))
