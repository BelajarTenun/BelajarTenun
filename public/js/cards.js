// Render kartu (protokol kartu VisionClaw v1): info | list | image; uuid sama = ganti di tempat.
import { esc } from './api.js';

export function renderCard(container, card) {
  if (!container || !card) return;
  let el = container.querySelector(`[data-uuid="${CSS.escape(card.uuid)}"]`);
  if (!el) { el = document.createElement('article'); el.className = 'tcard'; el.dataset.uuid = card.uuid; container.prepend(el); }
  const facts = (card.facts || []).map((f) => `<div class="fact"><span>${esc(f.label)}</span><b>${esc(f.value)}</b></div>`).join('');
  const items = (card.items || []).map((i) => `<li>${i.glyph ? `<span class="glyph">${esc(i.glyph)}</span>` : ''}<div><b>${esc(i.title)}</b>${i.subtitle ? `<small>${esc(i.subtitle)}</small>` : ''}</div>${i.trailing ? `<span class="trail">${esc(i.trailing)}</span>` : ''}</li>`).join('');
  const img = card.type === 'image' && /^https:|^recordings\//.test(card.image_url || '') ? `<img src="${esc(card.image_url)}" alt="">` : '';
  el.innerHTML = `<button class="x" aria-label="Tutup">✕</button>${card.title ? `<h4>${esc(card.title)}</h4>` : ''}${card.value ? `<p class="value">${esc(card.value)}</p>` : ''}${card.body ? `<p>${esc(card.body)}</p>` : ''}${img}${facts ? `<div class="facts">${facts}</div>` : ''}${items ? `<ul>${items}</ul>` : ''}${!card.title && !card.body && !items && !facts ? `<p>${esc(card.fallback_text)}</p>` : ''}`;
  el.querySelector('.x').onclick = () => el.remove();
  while (container.children.length > 3) container.lastElementChild.remove();
}
