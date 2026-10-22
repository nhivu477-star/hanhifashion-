import sqlite3,json,argparse,collections,hashlib
p=argparse.ArgumentParser();p.add_argument('--database',required=True);p.add_argument('--baseline',required=True);a=p.parse_args();c=sqlite3.connect(a.database);c.row_factory=sqlite3.Row;b=sqlite3.connect(a.baseline);b.row_factory=sqlite3.Row
batch='synthetic-history-2025-v1';ids=[r[0] for r in c.execute("select recordId from SyntheticRecord where batchId=? and entity='Order'",(batch,))];assert len(ids)==1000
assert c.execute('pragma integrity_check').fetchone()[0]=='ok';assert not list(c.execute('pragma foreign_key_check'))
for t in [r[0] for r in b.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%'") if r[0]!='_prisma_migrations']:
 cols=[r[1] for r in b.execute('pragma table_info("'+t+'")')];keys=[r[1] for r in b.execute('pragma table_info("'+t+'")') if r[5]]
 for row in b.execute('select * from "'+t+'"'):
  current=c.execute('select '+','.join('"'+k+'"' for k in cols)+' from "'+t+'" where '+' and '.join('"'+k+'"=?' for k in keys),[row[k] for k in keys]).fetchone()
  assert current is not None and tuple(current)==tuple(row),(t,keys,'Existing row changed')
for oid in ids:
 o=c.execute('select * from "Order" where id=?',(oid,)).fetchone();items=list(c.execute('select i.*,a.netAmount from OrderItem i join OrderLineAnalytics a on a.orderItemId=i.id where orderId=?',(oid,)))
 assert sum(i['quantity']*i['unitPrice'] for i in items)==o['subtotal'];assert sum(i['netAmount'] for i in items)==o['subtotal']-o['discount'];assert o['total']==o['subtotal']-o['discount']+o['shipping']
 pay=c.execute('select * from Payment where orderId=?',(oid,)).fetchone();assert pay['amount']==o['total'] and pay['status']==o['paymentStatus']
 sh=c.execute('select * from Shipment where orderId=?',(oid,)).fetchone()
 if sh:
  assert sh['recipientName']==o['name'] and sh['recipientPhone']==o['phone']
  assert sh['recipientAddress']==f"{o['details']} {o['street']}, {o['ward']}, {o['province']}"
  assert sh['expectedCOD']==(o['total'] if pay['method']=='COD' else 0)
  collected=c.execute('select coalesce(sum(amount),0) from CODCollection where shipmentId=?',(sh['id'],)).fetchone()[0];remitted=c.execute('select coalesce(sum(amount),0) from CODRemittance where shipmentId=?',(sh['id'],)).fetchone()[0]
  assert sh['collectedCOD']==collected and sh['remittedCOD']==remitted and sh['outstandingCOD']==collected-remitted>=0
  if sh['reconciliationStatus']=='RECONCILED':assert collected==remitted==sh['expectedCOD']
  if collected>remitted:assert sh['reconciliationStatus']=='PARTIALLY_REMITTED'
 refunds=list(c.execute('select f.*,r.createdAt requested,r.deliveredAt,r.deadline from MockRefund f join ReturnRequest r on r.id=f.requestId where f.orderId=?',(oid,)))
 assert sum(f['amount'] for f in refunds)<= (pay['amount'] if pay['status']=='PAID' else 0)
 for f in refunds:assert f['deliveredAt']<=f['requested']<=f['deadline']==f['deliveredAt']+72*3600000 and f['createdAt']<=f['completedAt']
 # Each generated order has an appropriate reserve/release ledger.
 for i in items:
  delta=c.execute('select sum(delta) from InventoryMovement where orderId=? and variantId=?',(oid,i['variantId'])).fetchone()[0]
  expected=-i['quantity'] if o['status'] not in ['CANCELLED','RETURNED'] else 0
  restored=c.execute('select coalesce(sum(ri.quantity),0) from ReturnItem ri join ReturnRequest r on r.id=ri.requestId where ri.orderItemId=? and ri.restocked=1',(i['id'],)).fetchone()[0]
  assert delta==expected+restored
# Cross-module event chronology, including the 72h policy and inspection before restock.
for f in c.execute("select r.* from ReturnRequest r join SyntheticRecord s on s.recordId=r.orderId where s.entity='Order' and s.batchId=?",(batch,)):
 delivered=c.execute("select createdAt from OrderStatusHistory where orderId=? and status='DELIVERED'",(f['orderId'],)).fetchone()[0]
 assert f['deliveredAt']==delivered
 history=list(c.execute('select * from ReturnHistory where requestId=? order by createdAt',(f['id'],)))
 assert [h['status'] for h in history]==['REQUESTED','UNDER_REVIEW','APPROVED','RECEIVED','INSPECTED','REFUND_PENDING','COMPLETED']
 inspection=c.execute('select x.createdAt from ReturnInspection x join ReturnItem i on i.id=x.itemId where i.requestId=?',(f['id'],)).fetchone()[0]
 assert history[3]['createdAt']<=inspection<=history[4]['createdAt']
 assert history[-1]['createdAt']<=f['updatedAt']
for record in c.execute('select * from SyntheticRecord where batchId=?',(batch,)):
 assert record['entity'] in ['User','Order','InventoryMovement']
 assert c.execute('select 1 from "'+record['entity']+'" where id=?',(record['recordId'],)).fetchone()
balances={r['id']:r['stock'] for r in b.execute('select id,stock from ProductVariant')};original=dict(balances)
for row in c.execute("select m.* from InventoryMovement m join SyntheticRecord s on s.recordId=m.id and s.entity='InventoryMovement' and s.batchId=? order by m.occurredAt,m.id",(batch,)):
 balances[row['variantId']]+=row['delta'];assert balances[row['variantId']]>=0
assert balances==original
report={'orders':1000,'customers':c.execute("select count(*) from SyntheticRecord where entity='User' and batchId=?",(batch,)).fetchone()[0],'items':c.execute('select count(*) from OrderItem where orderId in (select recordId from SyntheticRecord where entity=\'Order\' and batchId=?)',(batch,)).fetchone()[0],'statuses':dict(c.execute('select status,count(*) from "Order" where id in (select recordId from SyntheticRecord where entity=\'Order\' and batchId=?) group by status',(batch,))),'payments':dict(c.execute('select method,count(*) from Payment where orderId in (select recordId from SyntheticRecord where entity=\'Order\' and batchId=?) group by method',(batch,))),'refunds':c.execute('select count(*) from MockRefund where orderId in (select recordId from SyntheticRecord where entity=\'Order\' and batchId=?)',(batch,)).fetchone()[0],'integrity':'ok','foreignKeyErrors':0,'existingRowsUnchanged':True,'stockReplayNonnegative':True,'stockUnchanged':True}
print(json.dumps(report,ensure_ascii=False,indent=2))
