import {NextRequest,NextResponse} from 'next/server';
import {COOKIE_NAME} from '@/lib/auth';
export async function POST(req:NextRequest) {const r=NextResponse.redirect(new URL('/login',req.url),303);r.cookies.delete(COOKIE_NAME);return r;}
