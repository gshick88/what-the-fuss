// Topic shortcuts shown on the home screen and used as quick prompts.
export const TOPICS = [
  {
    key: 'sleep',
    label: 'Sleep',
    sub: 'wake windows, naps',
    color: 'berry',
    seed: 'Help me think about sleep — wake windows, naps, night routines.',
  },
  {
    key: 'feeding',
    label: 'Feeding',
    sub: 'amount, frequency',
    color: 'honey',
    seed: 'Help with feeding — how much, how often, what to expect.',
  },
  {
    key: 'poop',
    label: 'Poop & diapers',
    sub: 'color, frequency, weird stuff',
    color: 'sage',
    seed: 'I want to ask about poop — color, frequency, what is normal.',
  },
  {
    key: 'fever',
    label: 'Fever & meds',
    sub: 'when to worry',
    color: 'danger',
    seed: 'I have questions about fevers and when to call the doctor.',
  },
  {
    key: 'rashes',
    label: 'Rashes & skin',
    sub: 'snap a photo',
    color: 'berry',
    seed: 'Something on the skin I want to ask about. (You can attach a photo.)',
  },
  {
    key: 'normal',
    label: 'Is this normal?',
    sub: 'just gut-check it',
    color: 'honey',
    seed: 'I just need a gut-check on something — is what I am seeing normal?',
  },
];

export const COLOR_BG = {
  berry:  'bg-wtf-berry-soft',
  honey:  'bg-wtf-honey-soft',
  sage:   'bg-wtf-sage-soft',
  danger: 'bg-wtf-danger-soft',
};

export const COLOR_DOT = {
  berry:  'bg-wtf-berry',
  honey:  'bg-wtf-honey',
  sage:   'bg-wtf-sage',
  danger: 'bg-wtf-danger',
};

export const COLOR_TEXT = {
  berry:  'text-wtf-berry-dark',
  honey:  'text-[#854F0B]',
  sage:   'text-[#3B6D11]',
  danger: 'text-wtf-danger',
};
