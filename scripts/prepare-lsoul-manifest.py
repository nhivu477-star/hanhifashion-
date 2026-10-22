import json,re,unicodedata,collections
from pathlib import Path
src=json.load(open('scripts/data/lsoul-source.json'))
color_overrides=json.load(open('scripts/data/lsoul-color-overrides.json'))
manifest_path=Path('scripts/data/lsoul-manifest.json')
previous_designs={p['slug']:p for p in (json.loads(manifest_path.read_text())['designs'] if manifest_path.exists() else [])}
colors={'black':('Đen','#181818'),'white':('Trắng','#fafafa'),'grey':('Xám','#999999'),'brown':('Nâu','#795548'),'pink':('Hồng','#e5a1b1'),'red':('Đỏ','#b52c39'),'green':('Xanh lá','#508667'),'yellow':('Vàng','#efd77b'),'purple':('Tím','#956ca4'),'beige':('Be','#d8c4a8'),'blue':('Xanh dương','#5e87b8'),'lilac':('Tím lilac','#baa0c9'),'wine':('Đỏ rượu','#722c40'),'taupe':('Nâu taupe','#a28c7d'),'tiffany blue':('Xanh Tiffany','#83c8c6'),'turquoise blue':('Xanh ngọc','#56b3bd'),'burgundy':('Đỏ burgundy','#76283b'),'gold':('Vàng ánh kim','#bfa25b'),'silver':('Bạc','#c1c2c4'),'mist':('Xám khói','#c7c6c3'),'light blue':('Xanh dương nhạt','#a9c8e6'),'grey blue':('Xanh xám','#8595ad'),'mint':('Xanh bạc hà','#aacdbb'),'bronze':('Đồng','#ad8355'),'frost':('Trắng băng','#e0e4e3'),'noir':('Đen noir','#1b1b1b'),'ivory':('Trắng ngà','#ede6d5'),'moo':('Đen trắng','#d6d1c8'),'chestnut':('Nâu hạt dẻ','#805a43'),'cinnamon':('Nâu quế','#9a664b'),'dark havana':('Nâu Havana','#5b3d2d'),'pastel yellow':('Vàng pastel','#f1e3a3')}
def slug(s):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
def cat(r):
 if r['group']!='trang-phuc':return r['group']
 n=r['name'].lower()
 if any(x in n for x in ['dress','gown']):return 'dam'
 if any(x in n for x in ['skirt','jeans','pants','shorts','trousers','skort']):return 'quan-vay'
 if 'set' in n:return 'bo-trang-phuc'
 return 'ao'
types={'dress':'Đầm','jacket':'Áo khoác','top':'Áo','bodysuit':'Bodysuit','jeans':'Quần jeans','skirt':'Chân váy','pants':'Quần','trousers':'Quần','shorts':'Quần shorts','skort':'Quần giả váy','set':'Bộ','sandals':'Sandals','heels':'Giày cao gót','heel':'Giày cao gót','boots':'Boots','bag':'Túi','glasses':'Kính','sunglasses':'Kính mát','blazer':'Áo blazer'}
def title(base):
 for word,vi in types.items():
  if re.search(r'\b'+word+r'\b',base,re.I):return vi+' '+re.sub(r'\b'+word+r'\b','',base,flags=re.I).strip()
 return base
merged={}
for r in src['rows']:
 base=re.sub(r'\s*\([^)]*\)\s*','',r['name']).strip();category=cat(r);key=category+'-'+slug(base)
 m=merged.setdefault(key,{'id':'lsoul-'+key,'title':title(base),'sourceName':base,'slug':'ls-'+slug(base),'category':category,'brand':'LSOUL','sourceUrl':r['sourceUrl'],'price':r['price'],'sourceDescription':r['sourceDescription'],'colors':[]})
 m['price']=max(m['price'],r['price'])
 if r.get('colorways'):
  entries=[(c['name'],c['images'],c['sizes']) for c in r['colorways'] if c['images']]
 else:
  match=re.search(r'\(([^)]+)\)',r['name']);entries=[(match.group(1) if match else 'Nguyên bản',r['images'],r['sizes'])]
 for raw,imgs,sizes in entries:
  name,hexcolor=colors.get(raw.lower(),(raw,'#b8b8b8'))
  if raw == 'Nguyên bản' and m['slug'] in color_overrides:hexcolor=color_overrides[m['slug']]['hex']
  if any(c['name']==name for c in m['colors']):continue
  selected=list(dict.fromkeys((r['listingImages'][:1] if not r.get('colorways') else [])+imgs))
  # Preserve cached image paths while appending the complete source gallery.
  previous=next((c for c in previous_designs.get(m['slug'],{}).get('colors',[]) if c['name']==name),None)
  if previous:selected=list(dict.fromkeys(previous['images']+selected))
  m['colors'].append({'name':name,'hex':hexcolor,'sourceColor':raw,'sourceUrl':r['sourceUrl'],'sourcePrice':r['price'],'sizes':sizes or ['Một cỡ'],'available':r.get('available',True),'images':selected,'localImages':[f'/images/lsoul/products/{key}-{slug(name)}-{i}.webp' for i in range(len(selected))]})
rows=list(merged.values())
for r in rows:
 source=r['sourceDescription'].lower();parts=[]
 for token,desc in [('strapless','Thiết kế quây vai.'),('off-shoulder','Đường cổ trễ vai.'),('long sleeves','Tay dài.'),('sleeveless','Thiết kế không tay.'),('halter','Cổ yếm.'),('asymmetric','Đường cắt bất đối xứng.'),('ruffle','Chi tiết bèo nhún.'),('lace-up','Chi tiết dây đan.'),('keyhole','Chi tiết khoét giọt nước.'),('cutout','Đường cắt khoét tạo điểm nhấn.'),('mini','Phom dáng ngắn.'),('maxi','Phom dáng dài.'),('pleat','Chi tiết xếp ly.'),('wide-leg','Ống quần rộng.'),('high-rise','Thiết kế cạp cao.'),('zipper','Khóa kéo.'),('button','Chi tiết cài nút.'),('leopard','Họa tiết da báo.'),('faux fur','Bề mặt lông nhân tạo.'),('floral','Họa tiết hoa.'),('adjustable','Có chi tiết điều chỉnh.'),('pocket','Có túi.')]:
  if token in source:parts.append(desc)
 mats=[vn for en,vn in [('polyester','Polyester'),('pollyester','Polyester'),('polyamide','Polyamide'),('cotton','Cotton'),('linen','Linen'),('viscose','Viscose'),('spandex','Spandex'),('elastane','Elastane'),('leather','Da'),('denim','Denim'),('silk','Lụa'),('satin','Satin')] if en in source]
 r['material']=' / '.join(dict.fromkeys(mats)) or 'Xem thông tin nguồn'
 r['description']=' '.join(parts[:7]) or (r['title']+' thuộc nhóm '+{'ao':'áo','dam':'đầm','quan-vay':'quần và chân váy','bo-trang-phuc':'trang phục phối bộ','giay':'giày','tui-xach':'túi xách','phu-kien':'phụ kiện'}[r['category']]+'.')
 r['fit']='Theo thiết kế';r['sleeveType']='Dài tay' if 'long sleeve' in source else 'Theo thiết kế'
Path('scripts/data/lsoul-manifest.json').write_text(json.dumps({'sourceCounts':src['counts'],'sourceListings':len(src['rows']),'designs':rows},ensure_ascii=False,indent=2))
print('Prepared',len(rows),'designs',sum(len(r['colors']) for r in rows),'colorways',collections.Counter(r['category'] for r in rows))
