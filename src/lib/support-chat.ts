import { z } from 'zod';
import { db } from './db';
import { can } from './rbac';
import { orderTransaction } from './order-lifecycle';
import { requireActorPermission, requireCurrentAccount, operationalAudit } from './authorization';
import { replyFeedback } from './customer-feedback';
import { mutationReceipt } from './mutation-receipt';

async function chatActor(actor: {id: string; permissionVersion: number}) {
  const user = await requireCurrentAccount(db, actor);
  if (!user?.active || (user.role !== 'CUSTOMER' && !can(user.role, 'inquiries.read')))
    throw Error('Không có quyền truy cập hộp thư.');
  return user;
}
export async function readSupportChat(actor: {id: string; permissionVersion: number}, id?: string) {
  const user = await chatActor(actor);
  const staff = user.role !== 'CUSTOMER';
  const scope = staff ? {userId: {not: null}} : {userId: user.id};
  const threads = await db.inquiry.findMany({
    where: scope, orderBy: [{updatedAt: 'desc'}, {id: 'asc'}], take: 100,
    select: {id: true, subject: true, name: true, status: true, createdAt: true, updatedAt: true,
      replies: {orderBy: [{createdAt: 'desc'}, {id: 'desc'}], take: 1, select: {content: true}}},
  });
  const selectedId = id || threads[0]?.id;
  const thread = selectedId ? await db.inquiry.findFirst({
    where: {id: selectedId, ...scope},
    select: {id: true, userId: true, subject: true, message: true, createdAt: true, name: true,
      replies: {orderBy: [{createdAt: 'desc'}, {id: 'desc'}], take: 100,
        select: {id: true, actorId: true, content: true, createdAt: true, actor: {select: {name: true, role: true}}}}},
  }) : null;
  if (id && !thread) throw Error('Không tìm thấy cuộc trò chuyện.');
  const reference = thread?.message.match(/HN-RETURN-[A-Z0-9-]+/)?.[0];
  const returnInfo = reference && (!staff || can(user.role, 'returns.read'))
    ? await db.returnRequest.findFirst({where: {reference, userId: thread!.userId!}, select: {id: true, orderId: true, reference: true}}) : null;
  return {
    returnInfo,
    staff, canReply: !staff || can(user.role, 'inquiries.manage'),
    pending: staff ? await db.inquiry.count({where: {...scope, status: 'NEW'}}) : 0,
    threads: threads.map(({replies, ...t}) => ({...t, preview: replies[0]?.content ?? ''})),
    thread: thread ? {...thread, replies: thread.replies.reverse()} : null,
  };
}
export async function sendSupportMessage(input: unknown, actor: {id: string; permissionVersion: number}) {
  const user = await chatActor(actor);
  const d = z.object({
    id: z.string().min(1).optional(), content: z.string().trim().min(1).max(3000),
    eventKey: z.string().uuid(), subject: z.string().trim().min(1).max(150).optional(),
    orderId: z.string().min(1).optional(),
  }).strict().parse(input);
  if (d.id) return replyFeedback('inquiry', {id: d.id, content: d.content, eventKey: d.eventKey}, actor);
  if (user.role !== 'CUSTOMER') throw Error('Hãy chọn khách hàng để phản hồi.');
  return orderTransaction(async tx => {
    const fresh = await requireCurrentAccount(tx, actor);
    if (fresh.role !== 'CUSTOMER') throw Error('Tài khoản không đủ quyền gửi tin.');
    const receipt = await mutationReceipt(tx, 'SUPPORT_THREAD_CREATED', d.eventKey, fresh.id, d);
    if (receipt.replay) return {id: d.eventKey};
    let subject = d.subject || 'Trao đổi với Shop';
    if (d.orderId) {
      const order = await tx.order.findFirst({where: {id: d.orderId, userId: user.id}, select: {code: true}});
      if (!order) throw Error('Không tìm thấy đơn hàng của bạn.');
      subject = `Hỗ trợ đơn ${order.code}`;
    }
    const previous = await tx.inquiry.findUnique({where: {id: d.eventKey}});
    if (previous) {
      if (previous.userId !== user.id || previous.message !== d.content || previous.subject !== subject)
        throw Error('Khóa gửi tin đã được sử dụng.');
      await receipt.commit();
      return {id: previous.id};
    }
    const thread = await tx.inquiry.create({data: {
      id: d.eventKey, userId: fresh.id, name: fresh.name, email: fresh.email,
      phone: fresh.phone, subject, message: d.content,
    }});
    await operationalAudit(tx, fresh.id, 'SUPPORT_THREAD_CREATED', 'INQUIRY', thread.id,
      null, {orderId: d.orderId ?? null}, 'Khách gửi cuộc trao đổi với cửa hàng');
    await receipt.commit();
    return {id: thread.id};
  });
}
export async function markSupportRead(id: string, actor: {id: string; permissionVersion: number}) {
  await chatActor(actor);
  return orderTransaction(async tx => {
    await requireActorPermission(tx, actor, 'inquiries.read');
    const updated = await tx.inquiry.updateMany({where: {id, status: 'NEW'}, data: {status: 'READ'}});
    if (updated.count)
      await operationalAudit(tx, actor.id, 'SUPPORT_THREAD_READ', 'INQUIRY', id,
        {status: 'NEW'}, {status: 'READ'}, 'Nhân viên tiếp nhận cuộc trao đổi');
  });
}
