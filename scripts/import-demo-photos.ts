import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { mkdir, writeFile, access } from 'node:fs/promises';
const sources = [
 ['13007216','woman-in-white-long-sleeve-shirt-posing','ao-so-mi'],
 ['14934228','woman-in-white-long-sleeve-dress-shirt-and-brown-printed-skirt','ao-so-mi'],
 ['28967903','elegant-woman-in-pink-satin-blouse','ao-kieu'],
 ['26607662','brunette-woman-posing-in-studio','chan-vay'],
 ['4428045','a-portrait-of-a-woman-in-a-business-attire','ao-vest-blazer'],
 ['7959844','woman-in-black-blazer-and-pants','ao-vest-blazer'],
 ['19233835','blonde-woman-wearing-white-skirt-in-a-studio','ao-vest-blazer'],
 ['16459075','woman-posing-in-pink-trousers','quan-tay'],
 ['19397138','young-woman-in-pink-trousers-standing-on-the-sidewalk','quan-tay'],
 ['13816062','a-woman-in-beige-dress-posing-elegantly-on-the-camera','dam-cong-so'],
 ['13816066','a-woman-wearing-a-beige-dress','dam-cong-so'],
 ['17697765','brunette-woman-in-check-blazer-and-skirt-in-studio','set-cong-so'],
 ['19882698','woman-wearing-a-sweater','knit'],
 ['10177530','a-woman-wearing-a-sweater','knit'],
];
const db = new PrismaClient();
await mkdir('public/images/demo-photos',{recursive:true});
const downloaded = await Promise.all(sources.map(async ([id,slug,category])=>{
 const localPath=`/images/demo-photos/pexels-${id}.webp`;
 try {await access('public'+localPath);} catch {
 const r=await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&w=1400`);
 if(!r.ok) throw new Error(`Download ${id}: ${r.status}`);
 await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({width:1100,withoutEnlargement:true}).webp({quality:84}).toFile('public'+localPath);
 }
 return {id,category,localPath,source:`https://www.pexels.com/photo/${slug}-${id}/`};
}));
await writeFile('public/images/demo-photos/sources.json',JSON.stringify(downloaded,null,2));
if(process.argv.includes('--download-only')) {await db.$disconnect();process.exit(0);}
const products=await db.product.findMany({where:{enrichmentVersion:{gte:1}},include:{category:true,images:true,colors:{include:{images:true}}},orderBy:{sku:'asc'}});
await mkdir('verification/backups',{recursive:true});
await writeFile(`verification/backups/images-before-photo-demo-${Date.now()}.json`,JSON.stringify(products.map(p=>({id:p.id,images:p.images,colors:p.colors})),null,2));
const assets=new Map<string,string>();
for(const s of downloaded){
 const asset=await db.mediaAsset.upsert({where:{localPath:s.localPath},update:{},create:{localPath:s.localPath,originalSourceUrl:s.source,creator:'See linked Pexels photographer profile',licenseType:'Pexels License',licenseReference:'https://www.pexels.com/legal-pages/license/',authorizedUse:'LOCAL_DEMO',role:'DEVELOPMENT',reviewStatus:'PENDING',verificationNotes:'Licensed stock photography for localhost visual demo, as requested. Reused across sample designs; not verified merchandise or color evidence.',garmentVerified:false}});
 assets.set(s.id,asset.id);
}
const counts:Record<string,number>={};
for(const p of products){
 const key=p.category.slug;
 const pool=downloaded.filter(s=>s.category===key || (s.category==='knit' && /len|khoac|knit/.test(key)));
 if(!pool.length) throw new Error('Missing photo category '+key);
 const index=counts[key]??0; counts[key]=index+1;
 const s=pool[index%pool.length];const mediaAssetId=assets.get(s.id)!;
 await db.$transaction(async tx=>{
 await tx.productImage.deleteMany({where:{productId:p.id}});
 await tx.productImage.create({data:{productId:p.id,url:s.localPath,alt:'Ảnh chụp phối đồ tham khảo',position:0,mediaAssetId}});
 for(const c of p.colors){await tx.colorImage.deleteMany({where:{colorId:c.id}});await tx.colorImage.create({data:{colorId:c.id,url:s.localPath,alt:'Ảnh chụp phối đồ tham khảo',position:0,mediaAssetId}});}
 await tx.product.update({where:{id:p.id},data:{publicationStatus:'PENDING_ASSETS',merchandiseVerified:false}});
 });
}
for(const key of Object.keys(counts)) {const s=downloaded.find(s=>s.category===key || s.category==='knit'&&/len|khoac|knit/.test(key))!;await db.category.updateMany({where:{slug:key},data:{image:s.localPath}});}
console.log(JSON.stringify({downloaded:downloaded.length,products:products.length,categories:counts}));
await db.$disconnect();
