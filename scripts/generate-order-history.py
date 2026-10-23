"""Local, additive, atomic fixture history. Never invokes payment or carrier services.
Usage: python3 scripts/generate-order-history.py --database path.db
All generated identities are disabled and use reserved .test email addresses.
"""
import argparse, sqlite3, random, datetime, uuid, json, hashlib, collections
p=argparse.ArgumentParser();p.add_argument('--database',required=True);a=p.parse_args()
c=sqlite3.connect(a.database);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');r=random.Random(20251019)
batch='synthetic-history-2025-v1';now=int(datetime.datetime.now().timestamp()*1000);start=int(datetime.datetime(2025,1,1,tzinfo=datetime.timezone(datetime.timedelta(hours=7))).timestamp()*1000);day=86400000
if c.execute('select 1 from SyntheticBatch where id=?',(batch,)).fetchone():
 print('Batch already exists; no changes');raise SystemExit
uid=lambda:uuid.uuid4().hex
actor=c.execute("select id from User where role='ADMIN' and active=1 limit 1").fetchone()[0]
stock={x['id']:x['stock'] for x in c.execute('select id,stock from ProductVariant')};ledger=[]
def put(t,**d):
 c.execute('insert into "'+t+'" ('+','.join('"'+k+'"' for k in d)+') values ('+','.join('?' for _ in d)+')',list(d.values()));return d.get('id')
def mark(t,i):put('SyntheticRecord',id=uid(),batchId=batch,entity=t,recordId=i)
def movement(v,delta,t,reason,order=None):
 i=put('InventoryMovement',id=uid(),variantId=v,delta=delta,reason=reason,orderId=order,actorId=actor,kind='IN' if delta>0 else 'OUT',occurredAt=t,createdAt=t,notes='Ghi nhận biến động kho theo nghiệp vụ',eventKey=uid());mark('InventoryMovement',i);ledger.append((t,i,v,delta))
variants=list(c.execute('select v.*,p.name,p.price,p.salePrice,(select url from ProductImage where productId=p.id order by position limit 1) image from ProductVariant v join Product p on p.id=v.productId where p.active=1 and p.price>0'))
# Realistic shape, not inferred real commerce or fabricated verified merchandise/cost data.
with c:
 put('SyntheticBatch',id=batch,createdAt=now,manifest='{}')
 customers=[]
 for j in range(180):
  name=r.choice(['Nguyễn','Trần','Lê','Phạm','Hoàng','Đặng','Vũ'])+' '+r.choice(['Ngọc Anh','Thu Hà','Minh Trang','Mai Phương','Thanh Hương','Bảo Châu','Khánh Linh','Hải Yến'])
  i=uid();phone='09'+str(80000000+j);email=f'history-{j}@example.test';put('User',id=i,name=name,email=email,phone=phone,passwordHash='!SYNTHETIC_DISABLED',role='CUSTOMER',active=0,createdAt=start,updatedAt=start);mark('User',i);customers.append((i,name,phone,email))
 for n in range(1000):
  t=start+int((now-start-8*day)*n/969) if n<970 else now-(30-(n-970))*2*3600000
  t=min(t,now-3600000);u,name,phone,email=r.choice(customers);oid=uid();code='HN-'+datetime.datetime.fromtimestamp(t/1000).strftime('%y%m%d')+'-'+str(n+1).zfill(5)
  if n>=970: status=r.choice(['PENDING','CONFIRMED','PROCESSING','SHIPPING','DELIVERY_FAILED','DELIVERED'])
  else: status=r.choices(['COMPLETED','DELIVERED','CANCELLED','RETURNED'],[78,10,9,3])[0]
  fulfilled=status in ['DELIVERED','COMPLETED'];method=r.choices(['COD','BANK_TRANSFER','CASH'],[75,20,5])[0];paid=fulfilled
  chosen=r.sample(variants,r.choice([1,2,2,3,4]));lines=[]
  for v in chosen:
   q=r.choice([1,1,1,2,3]);price=v['priceOverride'] or v['salePrice'] or v['price'];lines.append((v,q,price))
  subtotal=sum(q*price for v,q,price in lines);discount=subtotal*r.choice([0,0,5,10,15])//100;shipping=r.choice([0,0,25000,30000]);total=subtotal-discount+shipping
  shipstate={'SHIPPING':'IN_TRANSIT','DELIVERY_FAILED':'FAILED','RETURNED':'RETURNED','DELIVERED':'DELIVERED','COMPLETED':'DELIVERED'}.get(status,'NOT_DISPATCHED');dt=min(t+2*day,now-1800000);end=min(t+6*day,now-600000)
  province=r.choice(['Hà Nội','Hưng Yên','Đà Nẵng','TP. Hồ Chí Minh']);details=str(r.randint(1,150));ward,street={'Hà Nội':('Hoàn Kiếm','Tràng Tiền'),'Hưng Yên':('Phố Hiến','Điện Biên'),'Đà Nẵng':('Hải Châu','Trần Phú'),'TP. Hồ Chí Minh':('Bến Nghé','Đồng Khởi')}[province]
  put('Order',id=oid,code=code,accessToken=uid(),idempotencyKey=batch+str(n),userId=u,name=name,phone=phone,email=email,province=province,ward=ward,street=street,details=details,notes='',status=status,paymentStatus='PAID' if paid else 'UNPAID',shippingStatus=shipstate,subtotal=subtotal,discount=discount,shipping=shipping,total=total,createdAt=t,updatedAt=end);mark('Order',oid)
  path=['PENDING','CONFIRMED','PROCESSING','SHIPPING','DELIVERED','COMPLETED']
  if status=='CANCELLED':path=['PENDING','CONFIRMED','CANCELLED']
  elif status in ['RETURNED','DELIVERY_FAILED']:path=['PENDING','CONFIRMED','PROCESSING','SHIPPING','DELIVERY_FAILED']+(['RETURNED'] if status=='RETURNED' else [])
  else:path=path[:path.index(status)+1]
  times={'PENDING':t,'CONFIRMED':t+(dt-t)//10,'PROCESSING':t+(dt-t)//5,'SHIPPING':t+3*(dt-t)//10,'DELIVERED':dt,'COMPLETED':end,'DELIVERY_FAILED':dt,'RETURNED':end,'CANCELLED':end}
  for i,s in enumerate(path):put('OrderStatusHistory',id=uid(),orderId=oid,status=s,previousStatus=path[i-1] if i else None,actorId=actor,actorLabel='HÀ NHI FASHION',event='STATUS_CHANGE',note='Cập nhật trạng thái đơn hàng',createdAt=times[s])
  remaining=discount;items=[]
  for k,(v,q,price) in enumerate(lines):
   iid=uid();put('OrderItem',id=iid,orderId=oid,productId=v['productId'],variantId=v['id'],name=v['name'],sku=v['sku'],size=v['size'],color=v['color'],image=v['image'] or '',quantity=q,unitPrice=price)
   allocation=remaining if k==len(lines)-1 else discount*(q*price)//subtotal;remaining-=allocation;net=q*price-allocation;put('OrderLineAnalytics',orderItemId=iid,netAmount=net);items.append((iid,v,q,net))
   movement(v['id'],-q,t,'Giữ hàng cho đơn',oid)
   if status in ['CANCELLED','RETURNED']:movement(v['id'],q,end,'Hoàn tồn hàng chưa giao',oid)
  pid=uid();put('Payment',id=pid,orderId=oid,method=method,amount=total,status='PAID' if paid else 'UNPAID',createdAt=t,collectedAt=dt if paid else None,collectedBy=actor if paid else None,collectionReference='HN-PAY-'+uid() if paid else None)
  if shipstate!='NOT_DISPATCHED':
   sid=uid();ref='HN-SHIP-'+uid().upper();sstatus={'FAILED':'DELIVERY_FAILED','RETURNED':'RETURNED'}.get(shipstate,shipstate);expected=total if method=='COD' else 0;collected=expected if paid else 0;remitted=collected if n%4 else collected//2;outstanding=collected-remitted;reconciled=paid and outstanding==0
   put('Shipment',id=sid,orderId=oid,paymentId=pid,reference=ref,provider='LOCAL_MANUAL',status=sstatus,shippingFee=shipping,expectedCOD=expected,collectedCOD=collected,remittedCOD=remitted,outstandingCOD=outstanding,reconciliationStatus='RECONCILED' if reconciled else ('PARTIALLY_REMITTED' if outstanding else 'PENDING'),reconciledAt=end if reconciled else None,reconciledBy=actor if reconciled else None,recipientName=name,recipientPhone=phone,recipientAddress=f'{details} {street}, {ward}, {province}',parcelDescription='Thời trang',weightGrams=500*len(items),createdBy=actor,createdAt=t,updatedAt=end)
   c.execute('update "Order" set shippingReference=? where id=?',(ref,oid))
   sp=['PENDING','READY_FOR_PICKUP','PICKED_UP','IN_TRANSIT']
   if sstatus=='DELIVERED':sp+=['OUT_FOR_DELIVERY','DELIVERED']
   elif sstatus in ['DELIVERY_FAILED','RETURNED']:sp+=['OUT_FOR_DELIVERY','DELIVERY_FAILED']+(['RETURNING','RETURNED'] if sstatus=='RETURNED' else [])
   stimes={'PENDING':t,'READY_FOR_PICKUP':t+(dt-t)//10,'PICKED_UP':t+(dt-t)//5,'IN_TRANSIT':t+3*(dt-t)//10,'OUT_FOR_DELIVERY':t+9*(dt-t)//10,'DELIVERED':dt,'DELIVERY_FAILED':dt,'RETURNING':end-3600000,'RETURNED':end}
   for j,s in enumerate(sp):put('ShipmentEvent',id=uid(),shipmentId=sid,previousStatus=sp[j-1] if j else None,status=s,actorId=actor,source='LOCAL_MANUAL',reason='Cập nhật vận chuyển',createdAt=stimes[s])
   if sstatus in ['DELIVERY_FAILED','RETURNED']:put('DeliveryAttempt',id=uid(),shipmentId=sid,reasonCode='RECIPIENT_UNAVAILABLE',note='Chưa liên hệ được người nhận',actorId=actor,createdAt=dt)
   for table,amount in [('CODCollection',collected),('CODRemittance',remitted)]:
    if amount:put(table,id=uid(),shipmentId=sid,eventKey=uid(),provider='LOCAL_MANUAL',reference='HN-LEDGER-'+uid(),amount=amount,evidence='Hồ sơ đối soát nội bộ; không phát sinh chuyển tiền.',occurredAt=end,actorId=actor,createdAt=end)
   if reconciled:put('CODReconciliation',id=uid(),shipmentId=sid,eventKey=uid(),action='RECONCILE',previousStatus='PENDING',status='RECONCILED',expected=expected,collected=collected,remitted=remitted,outstanding=0,note='Đối chiếu sổ thu',actorId=actor,createdAt=end)
  if fulfilled and n<970 and n%17==0:
   iid,v,q,net=items[0];rid=uid();amount=net//q;rt=dt+3600000;disp='SELLABLE' if n%2 else 'DAMAGED';restock=disp=='SELLABLE'
   put('ReturnRequest',id=rid,reference='HN-RETURN-'+uid(),eventKey=uid(),payloadHash=hashlib.sha256(rid.encode()).hexdigest(),orderId=oid,userId=u,status='COMPLETED',resolution='REFUND',reason='Lỗi đường may được xác nhận',policyVersion='DEFECT_72H_V1_2026-10-18',deliveredAt=dt,deadline=dt+3*day,released=0,version=6,createdAt=rt,updatedAt=end)
   ri=uid();put('ReturnItem',id=ri,requestId=rid,orderItemId=iid,quantity=1,amount=amount,disposition=disp,restocked=restock)
   put('ReturnInspection',id=uid(),itemId=ri,actorId=actor,condition=disp,notes='Đã kiểm tra lỗi sản phẩm',evidence='Hồ sơ kiểm hàng nội bộ; chưa có chứng từ thực tế.',createdAt=rt+4*3600000)
   states=['REQUESTED','UNDER_REVIEW','APPROVED','RECEIVED','INSPECTED','REFUND_PENDING','COMPLETED']
   for j,s in enumerate(states):put('ReturnHistory',id=uid(),requestId=rid,previousStatus=states[j-1] if j else None,status=s,actorId=actor,reason='Xử lý lỗi sản phẩm',createdAt=rt+j*3600000)
   put('MockRefund',id=uid(),reference='HN-REFUND-'+uid(),requestId=rid,orderId=oid,paymentId=pid,amount=amount,shippingAmount=0,reason='Lỗi sản phẩm',status='SIMULATED_COMPLETED',approvalActor=actor,completionActor=actor,createdAt=rt+5*3600000,completedAt=rt+6*3600000)
   if restock:movement(v['id'],1,rt+4*3600000,'Nhập lại hàng đã kiểm tra',oid)
 # Replay generated movements from existing baseline. Add supply only before shortages;
 # close excess by supplier return. No historical stock below zero; existing balances unchanged.
 balances=dict(stock)
 for t,i,v,delta in sorted(ledger):
  if balances[v]+delta<0:
   qty=-(balances[v]+delta);movement(v,qty,t-1,'Nhập bổ sung lịch sử');balances[v]+=qty
  balances[v]+=delta
 for v,value in balances.items():
  if value!=stock[v]:movement(v,stock[v]-value,now,'Cân đối lô lịch sử với tồn đầu kỳ')
 assert not c.execute('pragma foreign_key_check').fetchall()
 assert c.execute('pragma integrity_check').fetchone()[0]=='ok'
 assert dict((x['id'],x['stock']) for x in c.execute('select id,stock from ProductVariant'))==stock
 manifest={'synthetic':True,'seed':20251019,'orders':1000,'customers':180,'from':start,'to':now,'stockPolicy':'Existing balances preserved; generated supplies and supplier returns balance history','externalTransactions':False}
 c.execute('update SyntheticBatch set manifest=? where id=?',(json.dumps(manifest),batch))
 put('AuditLog',id=uid(),actorId=actor,action='SYNTHETIC_HISTORY_CREATED',resourceType='SYNTHETIC_BATCH',targetId=batch,detail=json.dumps(manifest),createdAt=now)
print(json.dumps(manifest))
