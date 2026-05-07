'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getBaby, setBaby as saveBaby } from '@/lib/db';
import { ageLabel } from '@/lib/storage';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0=welcome, 1=form, 2=done
  const [form, setForm] = useState({
    name: '',
    bornOrDue: 'due',
    dob: '',
    sex: '',
    feeding: '',
    birthWeight: '',
    notes: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getBaby();
      if (cancelled) return;
      if (existing) {
        setForm((prev) => ({ ...prev, ...existing }));
        setStep(1); // Skip welcome if already exists; let them edit
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function finish() {
    try {
      await saveBaby(form);
      setStep(2);
    } catch (e) {
      console.error('save baby failed', e);
    }
  }

  return (
    <>
      <Header back title={step === 1 ? 'Tell us about them' : ''} displayTitle />

      <main className="flex-1 flex flex-col max-w-md w-full mx-auto px-5">
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
            <div className="w-12 h-12 bg-wtf-berry rounded-wtf-lg flex items-center justify-center text-white text-[22px] font-medium mb-5">?!</div>
            <h1 className="font-display text-[40px] font-medium text-wtf-text leading-tight">Let's meet the <em className="italic">boss</em>.</h1>
            <p className="text-[28px] text-wtf-text-3 mt-3 max-w-[420px] leading-relaxed">
              30 seconds of setup so we can give you real answers, not Google sludge.
            </p>
            <button
              onClick={() => setStep(1)}
              className="mt-8 w-full bg-wtf-berry text-white rounded-wtf py-4 text-[28px] font-medium active:scale-[0.98]"
            >
              Let's do it
            </button>
            <button onClick={() => router.push('/')} className="mt-2 text-wtf-text-3 text-[17px] py-2">
              I'll do this later
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col py-4">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 h-1 bg-wtf-border rounded-full overflow-hidden">
                <div className="h-full bg-wtf-berry" style={{ width: '65%' }} />
              </div>
              <span className="text-[18px] text-wtf-text-3 font-medium">2 of 3</span>
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Itai"
                  className="w-full bg-white border border-wtf-border rounded-wtf-sm px-4 py-3 text-[22px] text-wtf-text outline-none focus:border-wtf-berry"
                />
              </Field>

              <Field label="Born or due?">
                <div className="flex gap-1.5 mb-2">
                  <Chip active={form.bornOrDue === 'born'} onClick={() => update('bornOrDue', 'born')}>Born</Chip>
                  <Chip active={form.bornOrDue === 'due'} onClick={() => update('bornOrDue', 'due')}>Due</Chip>
                </div>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => update('dob', e.target.value)}
                  className="w-full bg-white border border-wtf-border rounded-wtf-sm px-4 py-3 text-[22px] text-wtf-text outline-none focus:border-wtf-berry"
                />
              </Field>

              <Field label="Sex">
                <div className="flex gap-1.5 flex-wrap">
                  {['Boy', 'Girl', 'Surprise me'].map((s) => (
                    <Chip key={s} active={form.sex === s} onClick={() => update('sex', s)}>{s}</Chip>
                  ))}
                </div>
              </Field>

              <Field label="Powered by">
                <div className="flex gap-1.5 flex-wrap">
                  {['Breast', 'Bottle', 'Both', 'Decide later'].map((s) => (
                    <Chip key={s} active={form.feeding === s} onClick={() => update('feeding', s)}>{s}</Chip>
                  ))}
                </div>
              </Field>

              <Field label="Birth weight (rough is fine)">
                <input
                  type="text"
                  value={form.birthWeight}
                  onChange={(e) => update('birthWeight', e.target.value)}
                  placeholder="3.4 kg / 7lb 8oz"
                  className="w-full bg-white border border-wtf-border rounded-wtf-sm px-4 py-3 text-[22px] text-wtf-text outline-none focus:border-wtf-berry"
                />
              </Field>

              <Field label="Anything weird we should know?">
                <textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="C-section, allergies, that one strange thing..."
                  rows={3}
                  className="w-full bg-white border border-wtf-border rounded-wtf-sm px-3 py-3 text-[20px] text-wtf-text outline-none focus:border-wtf-berry resize-none"
                />
              </Field>
            </div>

            <div className="mt-6 mb-6 flex gap-2">
              <button onClick={() => setStep(0)} className="bg-white border border-wtf-border rounded-wtf py-4 px-7 text-[22px] text-wtf-text">
                Back
              </button>
              <button onClick={finish} className="flex-1 bg-wtf-berry text-white rounded-wtf py-4 text-[24px] font-medium active:scale-[0.98]">
                Save
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
            <div className="w-14 h-14 rounded-full bg-wtf-berry-soft flex items-center justify-center mb-5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7A3A5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <h1 className="font-display text-[36px] font-medium text-wtf-text leading-tight">Got it.</h1>
            <p className="text-[20px] text-wtf-text-3 mt-2 max-w-[320px] leading-relaxed">
              We've got {form.name || 'their'} stats. Every answer is shaped around them.
            </p>

            <div className="mt-5 bg-white border border-wtf-border rounded-wtf-lg p-4 w-full text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-wtf-berry-soft flex items-center justify-center text-wtf-berry-dark text-[22px] font-medium shrink-0">
                  {form.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-[28px] font-medium text-wtf-text leading-tight">{form.name || 'Unnamed'}</div>
                  <div className="text-[28px] text-wtf-text-3 leading-tight">
                    {ageLabel(form) || (form.bornOrDue === 'due' ? 'due date set' : 'no date set')}
                    {form.feeding && ` · ${form.feeding.toLowerCase()}`}
                  </div>
                </div>
              </div>
              <div className="text-[28px] text-wtf-muted pt-2 border-t border-wtf-border/60">
                Edit anytime from the corner avatar.
              </div>
            </div>

            <button
              onClick={() => router.push('/')}
              className="mt-6 w-full bg-wtf-berry text-white rounded-wtf py-3.5 text-[20px] font-medium active:scale-[0.98]"
            >
              Open the floodgates
            </button>
          </div>
        )}
      </main>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[18px] uppercase tracking-wider text-wtf-text-3 font-medium mb-2">{label}</div>
      {children}
    </div>
  );
}

function Chip({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-[22px] px-5 py-2 rounded-full border transition-colors ${
        active
          ? 'bg-wtf-berry-soft text-wtf-berry-dark border-wtf-berry font-medium'
          : 'bg-white text-wtf-text-2 border-wtf-border'
      }`}
    >
      {children}
    </button>
  );
}
