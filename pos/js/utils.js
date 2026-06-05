// ============================================================
// utils.js — helpers comunes
// ============================================================

// Money — PEN
export function money(n, opts = {}) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(v);
}

// Fecha legible
export function fmtHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export function tiempoTranscurrido(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

// DOM
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class')       node.className = v;
    else if (k === 'style')  Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined && v !== false) {
      node.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(String(c))
      : c);
  }
  return node;
}

// Toast (singleton)
let toastTimer = null;
export function toast(msg, kind = 'info', ms = 2200) {
  let t = $('#prep-toast');
  if (!t) {
    t = el('div', { id: 'prep-toast', class: 'toast' });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast' + (kind === 'error' ? ' toast--error' : kind === 'success' ? ' toast--success' : '');
  // Force reflow
  void t.offsetWidth;
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), ms);
}

// Modal
export function modal({ title, body, actions = [], onClose }) {
  const backdrop = el('div', { class: 'modal-backdrop is-open' });
  const close = () => {
    backdrop.remove();
    onClose?.();
  };

  const m = el('div', { class: 'modal' });

  if (title) {
    m.appendChild(el('div', { class: 'row between', style: { marginBottom: '16px' } },
      el('h2', {}, title),
      el('button', { class: 'btn btn--ghost btn--sm', onClick: close },
        el('span', { class: 'icon' }, 'close'))
    ));
  }

  if (body) m.appendChild(body instanceof Node ? body : el('div', {}, body));

  if (actions.length) {
    const row = el('div', { class: 'row', style: { marginTop: '24px', justifyContent: 'flex-end', flexWrap: 'wrap' } });
    actions.forEach(a => {
      const b = el('button', {
        class: 'btn ' + (a.className || ''),
        onClick: async () => {
          const r = await a.onClick?.();
          if (r !== false) close();
        }
      }, a.label);
      row.appendChild(b);
    });
    m.appendChild(row);
  }

  backdrop.appendChild(m);
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop && !actions.length) close();
  });
  document.body.appendChild(backdrop);
  return { close, el: m };
}

// Confirm rápido
export function confirmar(msg, opts = {}) {
  return new Promise(resolve => {
    modal({
      title: opts.title || 'Confirmar',
      body: el('p', { style: { margin: 0 } }, msg),
      actions: [
        { label: 'Atrás', className: 'btn--ghost', onClick: () => resolve(false) },
        { label: opts.ok || 'Va', className: 'btn--primary', onClick: () => resolve(true) }
      ],
      onClose: () => resolve(false)
    });
  });
}

// Debounce
export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// UUID corto para IDs locales (no DB)
export function uid() {
  return 'u' + Math.random().toString(36).slice(2, 10);
}

// Format helpers
export function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
