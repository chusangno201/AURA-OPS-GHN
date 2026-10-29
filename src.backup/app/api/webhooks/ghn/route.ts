import {NextRequest,NextResponse} from 'next/server';import crypto from 'node:crypto';import {db} from '@/lib/db';
export async function POST(req:NextRequest){
 const token=req.headers.get('x-aura-webhook-token')||'',expected=process.env.GHN_WEBHOOK_SECRET||'';
 if(!expected)return new Response('Unconfigured',{status:503});
 const a=Buffer.from(token),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return new Response('Unauthorized',{status:401});
 const e=await req.json();
 if(!e.OrderCode||!e.Type||!e.Time)return NextResponse.json({error:'Invalid GHN callback'},{status:400});
 if(process.env.GHN_SHOP_ID && String(e.ShopID)!==String(process.env.GHN_SHOP_ID))return new Response('Invalid ShopID',{status:403});
 const eventKey=crypto.createHash('sha256').update([e.OrderCode,e.Type,e.Time].join('|')).digest('hex');
 const o=await db.order.findFirst({where:{OR:[{ghnOrderCode:String(e.OrderCode)},{id:String(e.ClientOrderCode||'').replace(/^AURA-/,'')}]}});
 // Successful GHN shipment may precede DB persistence by a few ms: GHN retries if 5xx.
 if(!o)return new Response('Unknown order',{status:503});
 try {await db.ghnEvent.create({data:{eventKey,orderCode:String(e.OrderCode)}});}catch{return NextResponse.json({ok:true,duplicate:true});}
 const data:{ghnStatus?:string;codTransferredAt?:Date;ghnFee?:number;status?:string}={};
 if(e.Type==='switch_status'||e.Type==='create'){data.ghnStatus=String(e.Status||'');}
 if(e.Type==='cod'&&e.CODTransferDate)data.codTransferredAt=new Date(e.CODTransferDate);
 if(e.Type==='update_fee'&&Number.isFinite(Number(e.TotalFee)))data.ghnFee=Number(e.TotalFee);
 if(e.Status==='delivered')data.status='DELIVERED';
 if(['return','returned'].includes(e.Status))data.status='RETURNED';
 await db.order.update({where:{id:o.id},data:{...data,ghnOrderCode:String(e.OrderCode),sheetSyncedAt:null}});
 return NextResponse.json({ok:true});
}
