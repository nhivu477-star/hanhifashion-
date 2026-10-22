import sys,re,json,math,subprocess,hashlib,concurrent.futures,time
from pathlib import Path
sys.path.insert(0,'/tmp/lsoul-parser')
from bs4 import BeautifulSoup
ROOT=Path('verification/lsoul-raw');ROOT.mkdir(exist_ok=True)
BASE='https://lsoul.com/vn/'
categories={'trang-phuc':'women/ready-to-wear.html','giay':'women/shoes.html','tui-xach':'women/bag.html','phu-kien':'women/accessories.html'}
def fetch(url):
 p=ROOT/(hashlib.sha256(url.encode()).hexdigest()[:18]+'.html')
 if p.exists() and p.stat().st_size>5000:return p.read_text()
 r=subprocess.run(['curl','-f','-sSL','--max-time','40','--retry','1',url],capture_output=True)
 if r.returncode:raise RuntimeError(url)
 txt=r.stdout.decode('utf-8','replace')
 if len(txt)<5000 or '<title>Just a moment' in txt:raise RuntimeError('Blocked: '+url)
 p.write_text(txt);return txt

def listings(job):
 cat,url=job;s=BeautifulSoup(fetch(url),'html.parser');out=[]
 for item in s.select('li.product-item'):
  a=item.select_one('a.product-item-link');price=item.select_one('[data-price-type="finalPrice"]');imgs=item.select('img')
  if not a:continue
  out.append({'name':a.get_text(' ',strip=True),'url':a['href'],'group':cat,'price':int(float(price.get('data-price-amount',0))) if price else 0,'listingImages':list(dict.fromkeys(i.get('src') for i in imgs if '/media/catalog/product/' in i.get('src','')))})
 return out
jobs=[];counts={}
for cat,path in categories.items():
 url=BASE+path;s=BeautifulSoup(fetch(url),'html.parser');amount=s.select_one('.toolbar-amount');nums=re.findall(r'\d+',amount.get_text()) if amount else []
 total=int(nums[-1]) if nums else len(s.select('li.product-item'));per=int(nums[1]) if len(nums)>=3 else 12
 counts[cat]=total
 jobs.extend((cat,url+('' if p==1 else '?p='+str(p))) for p in range(1,math.ceil(total/per)+1))
print('Source counts',counts,'pages',len(jobs),flush=True)
allrows=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
 for rows in ex.map(listings,jobs):allrows.extend(rows)
unique={r['url'].split('/')[-1]:r for r in allrows};rows=list(unique.values());print('Unique source color listings',len(rows),flush=True)
def detail(row):
 s=BeautifulSoup(fetch(row['url']),'html.parser')
 canonical=s.select_one('link[rel="canonical"]');row['sourceUrl']=canonical['href'] if canonical else row['url']
 row['sourceDescription']=(s.select_one('.product.attribute.description').get_text(' ',strip=True) if s.select_one('.product.attribute.description') else '')
 row['breadcrumbs']=[a.get_text(' ',strip=True) for a in s.select('.breadcrumbs li')]
 row['images']=list(dict.fromkeys(i.get('src') for i in s.select('img.zoom-inner-image') if '/media/catalog/product/' in i.get('src','')))
 row['sizes']=[];row['sourceColors']=[]
 for el in s.select('script[type="text/x-magento-init"]'):
  try:j=json.loads(el.get_text())
  except:continue
  for v in j.values():
   if not isinstance(v,dict):continue
   for key,config in v.items():
    if not isinstance(config,dict) or 'jsonConfig' not in config:continue
    c=config['jsonConfig'];
    if not isinstance(c,dict):continue
    row['sourceId']=str(c.get('productId',''))
    row['available']=not config.get('productUnavailable',False)
    for attr in (c.get('attributes',{}).values() if isinstance(c.get('attributes',{}),dict) else c.get('attributes',[])):
     if 'size' in attr.get('code',''):row['sizes']=[o['label'] for o in attr['options']]
     if 'color' in attr.get('code',''):row['sourceColors']=[o['label'] for o in attr['options']]
     if 'color' in attr.get('code',''):
      row['colorways']=[]
      for option in attr['options']:
       imgs=next((c.get('images',{}).get(pid,[]) for pid in option['products'] if c.get('images',{}).get(pid)),[])
       color_sizes=[]
       for sa in (c.get('attributes',{}).values() if isinstance(c.get('attributes',{}),dict) else []):
        if 'size' in sa.get('code',''):
         color_sizes=[o['label'] for o in sa['options'] if set(o['products']) & set(option['products'])]
       row['colorways'].append({'name':option['label'],'images':list(dict.fromkeys(i.get('img',i.get('full')) for i in imgs if i.get('type')=='image')),'sizes':color_sizes})
    if not row['images']:
     imagegroups=c.get('images',{});first=next(iter(imagegroups.values()),[]) if isinstance(imagegroups,dict) else [];row['images']=[i.get('img',i.get('full')) for i in first if i.get('type')=='image']
 if not row['images']:row['images']=row['listingImages']
 return row
out=[];errors=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
 futures={ex.submit(detail,r):r for r in rows}
 for f in concurrent.futures.as_completed(futures):
  try:out.append(f.result())
  except Exception as e:errors.append(futures[f]['url']+': '+str(e))
  if (len(out)+len(errors))%25==0:print('Details',len(out),'errors',len(errors),flush=True)
Path('scripts/data/lsoul-source.json').write_text(json.dumps({'counts':counts,'rows':out,'errors':errors},ensure_ascii=False,indent=2))
print('Saved',len(out),'source listings. Errors',errors,flush=True)
