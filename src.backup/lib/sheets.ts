import { google } from 'googleapis';
import type { Order } from '@prisma/client';
const TAB = 'DonHang';
const HEADERS = ['ID','Ngày tạo','Fanpage ID','Tên khách','SĐT','Địa chỉ','Phường/Xã','Tỉnh/TP','Sản phẩm','Số lượng','Đơn giá','COD','GHN mã','GHN trạng thái','Phí GHN','COD chuyển khoản','Trạng thái nội bộ'];
function service() {
 if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) throw Error('Thiếu cấu hình Google Sheets');
 const auth = new google.auth.JWT({email:process.env.GOOGLE_CLIENT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'),scopes:['https://www.googleapis.com/auth/spreadsheets']});
 return google.sheets({version:'v4',auth});
}
export async function syncOrder(o:Order) {
 const sheets=service(); const spreadsheetId=process.env.GOOGLE_SHEET_ID!;
 const info=await sheets.spreadsheets.get({spreadsheetId,fields:'sheets(properties(title))'});
 if(!(info.data.sheets||[]).some(s=>s.properties?.title===TAB)) {
  await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{addSheet:{properties:{title:TAB}}}]}});
 }
 const range=`'${TAB}'!A:Q`;
 const old=await sheets.spreadsheets.values.get({spreadsheetId,range});
 const rows=old.data.values||[];
 if(!rows.length) await sheets.spreadsheets.values.update({spreadsheetId,range:`'${TAB}'!A1:Q1`,valueInputOption:'RAW',requestBody:{values:[HEADERS]}});
 const row=[o.id,o.createdAt.toISOString(),o.pageId||'',o.customerName,o.phone,o.address,o.ward,o.province,o.itemName,o.quantity,o.unitPrice,o.cod,o.ghnOrderCode||'',o.ghnStatus||'',o.ghnFee??'',o.codTransferredAt?.toISOString()||'',o.status];
 const found=rows.findIndex((r,i)=>i>0 && r[0]===o.id);
 if(found>=0) await sheets.spreadsheets.values.update({spreadsheetId,range:`'${TAB}'!A${found+1}:Q${found+1}`,valueInputOption:'RAW',requestBody:{values:[row]}});
 else await sheets.spreadsheets.values.append({spreadsheetId,range,valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[row]}});
}
