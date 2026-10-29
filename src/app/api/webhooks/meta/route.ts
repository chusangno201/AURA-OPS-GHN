import {NextRequest,NextResponse} from "next/server";
import crypto from "node:crypto";
import {db} from "@/lib/db";
import {processMessengerMessage} from "@/lib/auto-order/processor";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams;
 if(p.get("hub.mode")==="subscribe"&&process.env.META_VERIFY_TOKEN&&p.get("hub.verify_token")===process.env.META_VERIFY_TOKEN)
  return new Response(p.get("hub.challenge")||"");
 return new Response("Forbidden",{status:403});
}
export async function POST(req:NextRequest){
 const raw=await req.text(),received=req.headers.get("x-hub-signature-256")||"";
 if(!process.env.META_APP_SECRET)return new Response("Unconfigured",{status:503});
 const wanted="sha256="+crypto.createHmac("sha256",process.env.META_APP_SECRET).update(raw).digest("hex");
 const a=Buffer.from(received),b=Buffer.from(wanted);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return new Response("Invalid signature",{status:401});
 let body: {object?:string;entry?:Array<{id?:string;messaging?:Array<{
  sender?:{id?:string};recipient?:{id?:string};message?:{mid?:string;text?:string;is_echo?:boolean}
 }>}>};
 try{body=JSON.parse(raw);}catch{return new Response("Invalid JSON",{status:400});}
 if(body.object!=="page")return NextResponse.json({ok:true});
 for(const entry of body.entry||[]){
  const pageId=String(entry.id||"");
  for(const e of entry.messaging||[]){
   const msg=e.message;
   console.log("[META ECHO DEBUG]", {
     hasMessage: Boolean(e.message),
     isEcho: Boolean(e.message?.is_echo),
     senderIsPage: e.sender?.id === pageId,
     recipientIsPage: e.recipient?.id === pageId,
     hasText: typeof e.message?.text === "string",
     hasMid: Boolean(e.message?.mid)
   });

   if(!msg?.mid || !pageId)continue;
   const isEcho=Boolean(msg.is_echo);
   const senderId=String(isEcho ? e.recipient?.id||"" : e.sender?.id||"");
   if(!senderId || senderId===pageId)continue;
   const text=typeof msg.text==="string"?msg.text:"[attachment]";
   try{
    // Unique mid makes both message storage and processing idempotent.
    const saved=await db.message.create({data:{mid:msg.mid,pageId,senderId,isEcho,text}}).then(()=>true).catch(async error=>{
     if(error?.code==="P2002")return false;
     throw error;
    });
    if(saved && text!=="[attachment]")await processMessengerMessage({mid:msg.mid,pageId,senderId,isEcho,text});
   }catch(error){console.error("[AURA] Webhook processing failed",error instanceof Error?error.message:"Unknown");return new Response("Retry later",{status:500});}
  }
 }
 return NextResponse.json({ok:true});
}
