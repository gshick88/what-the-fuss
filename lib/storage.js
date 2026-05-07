// Pure helpers — formatting baby data for prompts and labels. The data layer
// lives in lib/db.js (Supabase). This file used to hold localStorage logic
// before V2; now it's just utilities that take baby objects and return strings.

export function babyContextString(baby) {
  if (!baby) return '';
  const parts = [];
  if (baby.name) parts.push(`Name: ${baby.name}`);
  if (baby.dob) {
    const days = Math.floor((Date.now() - new Date(baby.dob)) / 86400000);
    if (days < 0) parts.push(`Status: due in ${Math.abs(days)} days (not yet born)`);
    else if (days < 14) parts.push(`Age: ${days} days old`);
    else if (days < 90) parts.push(`Age: ${Math.floor(days / 7)} weeks old`);
    else parts.push(`Age: ${Math.floor(days / 30)} months old`);
  }
  if (baby.sex) parts.push(`Sex: ${baby.sex}`);
  if (baby.feeding) parts.push(`Feeding: ${baby.feeding}`);
  if (baby.birthWeight) parts.push(`Birth weight: ${baby.birthWeight}`);
  if (baby.notes) parts.push(`Notes: ${baby.notes}`);
  return parts.join(' · ');
}

export function ageLabel(baby) {
  if (!baby?.dob) return '';
  const days = Math.floor((Date.now() - new Date(baby.dob)) / 86400000);
  if (days < 0) return `due in ${Math.abs(days)}d`;
  if (days < 14) return `${days}d`;
  if (days < 90) return `${Math.floor(days / 7)}wk`;
  return `${Math.floor(days / 30)}mo`;
}
