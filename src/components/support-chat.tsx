"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, Send, X } from 'lucide-react';
type Thread = {id: string; subject: string; name: string; status: string; preview: string; updatedAt: string};
type ChatData = {
  staff: boolean; canReply: boolean; pending: number; threads: Thread[];
  thread: null | {id: string; userId: string; name: string; subject: string; message: string; createdAt: string;
    replies: {id: string; actorId: string; content: string; createdAt: string; actor: {name: string; role: string}}[]};
  returnInfo?: {id: string; orderId: string; reference: string} | null;
};
async function request(body: unknown) {
  const response = await fetch('/api/support/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Chưa gửi được tin nhắn.');
  return data;
}
const time = (date: string) => new Date(date).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'});
export function SupportChat({userId, staff = false, orderId}: {userId: string; staff?: boolean; orderId?: string}) {
  const [data, setData] = useState<ChatData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(Boolean(orderId));
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('Trao đổi với Shop');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const key = useRef('');
  const scroll = useRef<HTMLDivElement>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/support/chat' + (selected ? '?id=' + encodeURIComponent(selected) : ''), {cache: 'no-store', signal});
      const next = await response.json();
      if (!response.ok) throw Error(next.error);
      setData(next);
      if (!drafting && selected === null && next.thread) setSelected(next.thread.id);
      if (staff && !drafting && next.thread && next.threads.some((t: Thread) => t.id === next.thread.id && t.status === 'NEW'))
        await request({operation: 'read', id: next.thread.id});
      setLoading(false);
    } catch (e) {
      if (signal?.aborted) return;
      setError((e as Error).message || 'Không thể kết nối hộp thư.');
      setLoading(false);
    }
  }, [selected, drafting, staff]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => {if (document.visibilityState === 'visible') void load(controller.signal);}, 4000);
    return () => {controller.abort(); clearInterval(timer);};
  }, [load]);
  const changing = !drafting && selected !== null && data?.thread?.id !== selected;
  const thread = drafting || changing ? null : data?.thread;
  const lastId = thread?.replies.at(-1)?.id ?? thread?.id;
  useEffect(() => {if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;}, [lastId, drafting]);
  return (
    <section className="support-chat" aria-label={staff ? 'Hộp thư khách hàng' : 'Nhắn tin với Shop'}>
      <aside className="chat-threads">
        <div className="chat-heading"><strong>{staff ? 'Hộp thư khách hàng' : 'Tin nhắn với Shop'}</strong>
          {!staff && <button type="button" className="chat-new" onClick={() => {setDrafting(true); setSelected(null); setText(''); key.current = ''; setError('');}}>Tin mới</button>}
        </div>
        {data?.threads.map(t => <button key={t.id} type="button" className={'chat-thread' + (!drafting && selected === t.id ? ' selected' : '')} onClick={() => {setSelected(t.id); setDrafting(false); setText(''); setError(''); key.current = '';}}>
          <strong>{staff ? t.name : t.subject}{staff && t.status === 'NEW' && <span className="chat-unread">Mới</span>}</strong>
          {staff && <span>{t.subject}</span>}<small>{t.preview || 'Mở cuộc trò chuyện'} · {time(t.updatedAt)}</small>
        </button>)}
        {!loading && !data?.threads.length && <p className="chat-hint">{staff ? 'Chưa có tin nhắn từ khách hàng.' : 'Gửi tin nhắn đầu tiên để trao đổi với Shop.'}</p>}
      </aside>
      <div className="chat-conversation">
        <div className="chat-heading"><strong>{thread?.subject || (orderId ? 'Trao đổi về đơn hàng' : 'Nhắn tin trực tiếp')}</strong><small>Tự cập nhật mỗi 4 giây</small></div>
        {loading && <p role="status" className="chat-hint">Đang tải tin nhắn…</p>}
        {data?.returnInfo && !drafting && <Link className="chat-return-link" href={staff ? '/admin/doi-tra/' + data.returnInfo.id : '/tai-khoan/don-hang/' + data.returnInfo.orderId}>Xem yêu cầu đổi trả →</Link>}
        <div ref={scroll} className="chat-log" role="log" aria-live="polite" aria-label="Nội dung cuộc trò chuyện">
          {thread ? <>
            <article className={'chat-bubble ' + (thread.userId === userId ? 'mine' : '')}><strong>{thread.userId === userId ? 'Bạn' : thread.name}</strong><p>{thread.message}</p><time>{time(thread.createdAt)}</time></article>
            {thread.replies.map(m => <article key={m.id} className={'chat-bubble ' + (m.actorId === userId ? 'mine' : '')}><strong>{m.actorId === userId ? 'Bạn' : m.actor.role === 'CUSTOMER' ? m.actor.name : 'Shop · ' + m.actor.name}</strong><p>{m.content}</p><time>{time(m.createdAt)}</time></article>)}
          </> : !loading && <p className="chat-hint">{staff ? 'Chọn cuộc trò chuyện để xem và trả lời khách.' : 'Shop nhận tin nhắn tại đây. Bạn có thể hỏi về sản phẩm, đơn hàng hoặc yêu cầu đổi trả.'}</p>}
        </div>
        {(!staff || thread) && (data?.canReply ?? !staff) && <form className="chat-composer" onSubmit={async e => {
          e.preventDefault(); if (busy || changing || !text.trim()) return; setBusy(true); setError(''); key.current ||= crypto.randomUUID();
          try {
            const out = await request({...(thread ? {id: thread.id} : {subject, ...(orderId ? {orderId} : {})}), content: text, eventKey: key.current});
            setText(''); key.current = ''; setDrafting(false); setSelected(out.id); await load();
          } catch (e) {setError((e as Error).message);} finally {setBusy(false);}
        }}>
          {!thread && !orderId && <input aria-label="Chủ đề cuộc trò chuyện" value={subject} maxLength={150} required onChange={e => {setSubject(e.target.value); key.current = '';}} />}
          <label className="chat-input-label">Tin nhắn<textarea rows={2} maxLength={3000} required value={text} disabled={busy || changing} placeholder="Nhập tin nhắn…" onChange={e => {setText(e.target.value); key.current = '';}} onKeyDown={e => {if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault(); e.currentTarget.form?.requestSubmit();}}} /></label>
          <button type="submit" className="button" disabled={busy || changing || !text.trim()}><Send size={16}/>{busy ? 'Đang gửi…' : 'Gửi tin nhắn'}</button>
        </form>}
        {error && <p className="chat-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
export function ShopChatLauncher({userId, staff = false}: {userId?: string; staff?: boolean}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!userId || !staff) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {const response = await fetch('/api/support/chat', {cache: 'no-store', signal: controller.signal}); if (response.ok) {const d = await response.json(); setPending(d.pending);}} catch {}
    };
    void refresh(); const timer = setInterval(() => {if (document.visibilityState === 'visible') void refresh();}, 8000);
    return () => {controller.abort(); clearInterval(timer);};
  }, [userId, staff]);
  if (pathname.startsWith('/tai-khoan/ho-tro') || pathname.startsWith('/admin/lien-he')) return null;
  if (!userId) return <Link href="/dang-nhap" className="shop-chat-launcher"><MessageCircle size={20}/>Nhắn Shop</Link>;
  return <div className="shop-chat-widget">
    {open && <div className="shop-chat-panel" role="dialog" aria-label={staff ? 'Tin nhắn khách hàng' : 'Nhắn Shop'}>
      <div className="chat-heading"><strong>{staff ? 'Tin nhắn khách hàng' : 'Nhắn Shop'}</strong><button type="button" aria-label="Đóng hộp chat" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <SupportChat userId={userId} staff={staff}/>
    </div>}
    <button type="button" className="shop-chat-launcher" aria-expanded={open} onClick={() => setOpen(!open)}><MessageCircle size={20}/>{staff ? 'Tin nhắn khách' : 'Nhắn Shop'}{pending > 0 && <span className="chat-unread">{pending} mới</span>}</button>
  </div>;
}
