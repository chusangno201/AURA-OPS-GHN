import {NextRequest,NextResponse} from 'next/server';import {db} from '@/lib/db';import {syncOrder} from '@/lib/sheets';
export async function GET(req:NextRequest){
 if(!process.env.CRON_SECRET||req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 const batch=await db.order.findMany({where:{OR:[{sheetSyncedAt:null},{updatedAt:{gt:new Date(Date.now()-5*60*1000)}}]},orderBy:{updatedAt:'asc'},take:40});
 let done=0;const errors:string[]=[];
 for(const o of batch){try{await syncOrder(o);await db.order.update({where:{id:o.id},data:{sheetSyncedAt:new Date()}});done++;}catch(e){errors.push(`${o.id}: ${e instanceof Error?e.message:'error'}`);}}
 return NextResponse.json({done,errors});
}
