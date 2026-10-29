import crypto from 'node:crypto';
import { cookies } from 'next/headers';
const cookieName = 'aura_session';
function sig(s: string) { return crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(s).digest('hex'); }
export function makeSession() {
 const stamp = `${Math.floor(Date.now()/1000) + 86400 * 7}`;
 return `${stamp}.${sig(stamp)}`;
}
export async function authenticated() {
 if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) return false;
 const token = (await cookies()).get(cookieName)?.value || '';
 const [stamp, mac] = token.split('.');
 if (!stamp || !mac || !/^\d+$/.test(stamp) || Number(stamp) < Date.now()/1000) return false;
 const expected = sig(stamp);
 const a = Buffer.from(mac); const b = Buffer.from(expected);
 return a.length === b.length && crypto.timingSafeEqual(a,b);
}
export const COOKIE_NAME = cookieName;
