'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import {
  getBaby,
  getHouseholdMembers,
  listInvitations,
  createInvitation,
  deleteInvitation,
  getCurrentUser,
} from '@/lib/db';

function timeUntil(iso) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d left`;
  return `${hours}h left`;
}

export default function SharePage() {
  const [baby, setBaby] = useState(null);
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, m, mems, ivs] = await Promise.all([
          getBaby(),
          getCurrentUser(),
          getHouseholdMembers(),
          listInvitations(),
        ]);
        if (cancelled) return;
        setBaby(b);
        setMe(m);
        setMembers(mems);
        setInvites(ivs);
      } catch (e) {
        setError(e.message || 'Could not load.');
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const inv = await createInvitation();
      setInvites((prev) => [inv, ...prev]);
    } catch (e) {
      setError(e.message || 'Could not create invite.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    if (!confirm('Revoke this invite link? Anyone holding it won\'t be able to use it.')) return;
    try {
      await deleteInvitation(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e.message || 'Could not revoke.');
    }
  }

  async function copyLink(token) {
    const url = `${window.location.origin}/auth/accept?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 1800);
    } catch {
      // Fallback: just open the link
      prompt('Copy this link:', url);
    }
  }

  function shareWhatsApp(token) {
    const url = `${window.location.origin}/auth/accept?token=${token}`;
    const msg = encodeURIComponent(`Come join the WTF baby chat: ${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  const activeInvites = invites.filter((i) => !i.used_at && new Date(i.expires_at) > new Date());

  return (
    <>
      <Header baby={baby} back title="Add to the chat" displayTitle />

      <main className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 pt-3 pb-6">
        <p className="text-[18px] text-wtf-text-3 mb-5">
          Co-parent, grandma, the friend who's done this before.
        </p>

        {/* MEMBERS */}
        <div className="text-[14px] uppercase tracking-wider text-wtf-text-3 font-medium mb-2">In the chat</div>
        <div className="bg-white border border-wtf-border rounded-wtf-lg p-3 mb-5 flex flex-col gap-2.5">
          {loading && <div className="text-wtf-muted text-[16px] py-2">Loading…</div>}
          {!loading && members.map((m) => {
            const isMe = m.user_id === me?.id;
            const display = m.display_name || m.email || 'Member';
            const initial = (display[0] || '?').toUpperCase();
            return (
              <div key={m.user_id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-wtf-berry-soft text-wtf-berry-dark text-[16px] font-medium flex items-center justify-center shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[18px] font-medium text-wtf-text truncate">
                    {display}{isMe ? ' (you)' : ''}
                  </div>
                  <div className="text-[14px] text-wtf-text-3 truncate">
                    {m.role === 'owner' ? 'Owner' : 'Member'} · joined {new Date(m.joined_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ACTIVE INVITES */}
        {activeInvites.length > 0 && (
          <>
            <div className="text-[14px] uppercase tracking-wider text-wtf-text-3 font-medium mb-2">Pending invites</div>
            <div className="flex flex-col gap-2 mb-5">
              {activeInvites.map((inv) => (
                <div key={inv.id} className="bg-white border border-wtf-border rounded-wtf-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-[14px] text-wtf-muted truncate flex-1">
                      …/auth/accept?token={inv.token.slice(0, 6)}…
                    </div>
                    <span className="text-[13px] text-wtf-text-3 shrink-0">{timeUntil(inv.expires_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLink(inv.token)}
                      className="flex-1 bg-wtf-berry text-white rounded-wtf py-2.5 text-[16px] font-medium active:scale-[0.98]"
                    >
                      {copiedToken === inv.token ? 'Copied!' : 'Copy link'}
                    </button>
                    <button
                      onClick={() => shareWhatsApp(inv.token)}
                      className="bg-white border border-wtf-border text-wtf-text rounded-wtf py-2.5 px-4 text-[16px] font-medium active:scale-[0.98]"
                      aria-label="Share via WhatsApp"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="bg-white border border-wtf-border text-wtf-muted rounded-wtf py-2.5 px-3 text-[14px]"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CREATE NEW INVITE */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full bg-wtf-berry text-white rounded-wtf py-4 text-[20px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-opacity"
        >
          <span className="text-2xl leading-none">+</span>
          {creating ? 'Creating…' : 'New invite link'}
        </button>

        {error && (
          <div className="mt-3 text-[15px] text-wtf-danger bg-wtf-danger-soft rounded-wtf p-3">
            {error}
          </div>
        )}

        <div className="mt-auto pt-6 text-[15px] text-wtf-muted leading-relaxed">
          Anyone with the link can join. Links last 14 days and can be used once. Revoke anytime to kill an unused link.
        </div>
      </main>
    </>
  );
}
