import { NextRequest, NextResponse } from 'next/server';
import { currentUser, rateLimit } from '@/lib/auth';
import { readSupportChat, sendSupportMessage, markSupportRead } from '@/lib/support-chat';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => NextResponse.json(data, {status, headers: {'Cache-Control': 'private, no-store'}});
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return json({error: 'Vui lòng đăng nhập để nhắn tin.'}, 401);
  try { return json(await readSupportChat(user, req.nextUrl.searchParams.get('id') || undefined)); }
  catch { return json({error: 'Không thể mở cuộc trò chuyện này.'}, 403); }
}
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return json({error: 'Vui lòng đăng nhập để nhắn tin.'}, 401);
  const origin = req.headers.get('origin');
  if (origin && origin !== `${req.nextUrl.protocol}//${req.headers.get('host')}`) return json({error: 'Yêu cầu không hợp lệ.'}, 403);
  if (Number(req.headers.get('content-length') ?? 0) > 20000) return json({error: 'Tin nhắn quá dài.'}, 413);
  try {
    const body = await req.json();
    if (body.operation === 'read') {
      const d = z.object({operation: z.literal('read'), id: z.string().min(1)}).strict().parse(body);
      await markSupportRead(d.id, user);
      return json({success: true});
    }
    rateLimit('chat:' + user.id, 120);
    return json(await sendSupportMessage(body, user));
  } catch (error) {
    return json({error: error instanceof Error && !error.name.startsWith('Prisma') ? error.message : 'Chưa gửi được tin nhắn. Vui lòng thử lại.'}, 400);
  }
}
