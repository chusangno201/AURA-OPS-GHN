import type {Metadata} from 'next';import './style.css';
export const metadata:Metadata={title:'Aura Ops | Quản lý đơn',description:'Nội bộ quản lý đơn Messenger, GHN, Google Sheets'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}
