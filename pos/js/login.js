// ============================================================
// login.js · Pantalla de ingreso con master password
// ============================================================
import { loginConMaster, setNombre } from './supabase-client.js';
import { el, $, toast } from './utils.js';

export function renderLogin(container, onSuccess) {
  container.innerHTML = '';

  const wrap = el('div', { class: 'login-wrap' });

  const card = el('div', { class: 'login-card' },
    el('div', { class: 'login-brand' },
      el('span', { class: 'eyebrow' }, 'Casa Italia · POS'),
      el('h1', { class: 'display' }, 'Prep!'),
      el('p', { class: 'mono', style: { opacity: 0.6, fontSize: '0.85rem', margin: 0 } },
        'Mise en place')
    ),

    el('form', { id: 'login-form', class: 'col gap-4', onSubmit: e => e.preventDefault() },
      el('div', {},
        el('label', { class: 'label', for: 'login-name' }, 'Tu nombre'),
        el('input', {
          class: 'field', type: 'text', id: 'login-name',
          placeholder: 'Diego, Andrea, Renato…',
          autocomplete: 'off'
        })
      ),
      el('div', {},
        el('label', { class: 'label', for: 'login-pw' }, 'Contraseña'),
        el('input', {
          class: 'field field--mono', type: 'password', id: 'login-pw',
          placeholder: '••••••••••', autocomplete: 'current-password'
        })
      ),
      el('button', {
        class: 'btn btn--primary btn--lg btn--block',
        id: 'login-btn',
        onClick: handleLogin
      },
        el('span', { class: 'icon' }, 'login'),
        'Ingresar'
      ),
      el('p', { class: 'mono', style: { fontSize: '0.7rem', opacity: 0.5, textAlign: 'center', margin: 0 } },
        'Sesión válida por 12 horas')
    )
  );

  wrap.appendChild(card);

  // Footer brand
  wrap.appendChild(el('div', { class: 'login-footer' },
    el('span', { class: 'mono' }, 'prep'),
    el('span', { class: 'mono', style: { opacity: 0.4 } }, '.rest')
  ));

  container.appendChild(wrap);

  // Auto-focus
  setTimeout(() => $('#login-name')?.focus(), 100);

  // Enter to submit
  ['login-name', 'login-pw'].forEach(id => {
    $('#' + id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
  });

  async function handleLogin() {
    const btn = $('#login-btn');
    const nombre = $('#login-name').value.trim();
    const pw = $('#login-pw').value;

    if (!nombre) { toast('Atrás — falta tu nombre', 'error'); $('#login-name').focus(); return; }
    if (!pw)     { toast('Atrás — falta contraseña', 'error'); $('#login-pw').focus(); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="icon">hourglass</span> Oído…';

    const res = await loginConMaster(pw);

    if (!res.ok) {
      toast(res.error || 'Atrás — credenciales inválidas', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="icon">login</span> Ingresar';
      $('#login-pw').value = '';
      $('#login-pw').focus();
      return;
    }

    setNombre(nombre);
    toast(`Va — bienvenido, ${nombre}`, 'success');
    onSuccess?.();
  }
}
