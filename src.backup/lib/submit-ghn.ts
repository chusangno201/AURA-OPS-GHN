import {db} from '@/lib/db';
import {createShipment} from '@/lib/ghn';

export async function submitOrderToGhn(id:string) {
  const order=await db.order.findUnique({where:{id}});
  if(!order) return {status:'NOT_FOUND'} as const;
  if(order.ghnOrderCode) return {status:'ALREADY'} as const;

  const lock=await db.order.updateMany({
    where:{id, status:'DRAFT', ghnOrderCode:null},
    data:{status:'GHN_SENDING'}
  });
  if(lock.count!==1) return {status:'BUSY'} as const;

  try {
    const shipment=await createShipment(order);
    await db.order.update({
      where:{id},
      data:{
        ghnOrderCode:shipment.code,
        ghnFee:shipment.fee,
        ghnStatus:'ready_to_pick',
        status:'SUBMITTED'
      }
    });
    return {status:'SENT'} as const;
  } catch(e) {
    console.error('GHN needs reconciliation:',e instanceof Error?e.message:'Unknown');
    await db.order.updateMany({
      where:{id,status:'GHN_SENDING'},
      data:{status:'GHN_REVIEW'}
    });
    return {status:'ERROR'} as const;
  }
}
