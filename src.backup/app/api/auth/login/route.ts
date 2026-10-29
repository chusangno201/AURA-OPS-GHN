import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {COOKIE_NAME,makeSession} from '@/lib/auth';
export async function POST(req:NextRequest) {
 const form=await req.formData();
 const candidate=String(form.get('password')||'');const expected=process.env.ADMIN_PASSWORD||'';
 const a=Buffer.from(candidate); const b=Buffer.from(expected);
 if (!expected || a.length!==b.length || !crypto.timingSafeEqual(a,b)) return NextResponse.redirect(new URL('/login?error=1',req.url),303);
 const res=NextResponse.redirect(new URL('/',req.url),303);
 res.cookies.set(COOKIE_NAME,makeSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7*86400});
 return res;
}
