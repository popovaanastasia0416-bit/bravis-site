// Интерактив сайта: меню, офер, корзина, ИИ-консьерж, галерея товара, фильтры, формы, вход и кабинет.
// Данные товаров — window.SHOP (собирает build.py), корзина и «аккаунт» — в localStorage.
// Параметры для кадров в Figma: ?popup ?nopop ?menu ?cart ?ai ?filters ?modal=ebook|review|cookie ?done
(() => {
  const q = new URLSearchParams(location.search);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SHOP = window.SHOP || {};
  const LINKS = window.LINKS || {};
  const rub = (n) => n.toLocaleString('ru-RU') + ' ₽';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const KEY = 'bravis-cart';
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const html = document.documentElement;
  let staticMode = false;
  const lock = (on) => { if (!staticMode) html.classList.toggle('no-scroll', on); };

  // уведомление
  const toastEl = $('#toast');
  let toastT;
  const toast = (t) => { if (!toastEl) return; toastEl.innerHTML = t; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600); };
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-toast]'); if (t) { if (t.tagName === 'A') e.preventDefault(); toast(t.dataset.toast); } });

  // кадр для Figma: оверлей поверх первого экрана
  const frameMode = (el) => { staticMode = true; html.classList.add('frame-root'); document.body.classList.add(document.querySelector('.hero') ? 'popup-mode' : 'overlay-mode'); el.classList.add('is-static'); };

  // ——— офер (главная) ———
  const pop = $('#popup');
  if (pop) {
    if (q.has('popup')) { document.body.classList.add('popup-mode'); pop.classList.add('is-open'); }
    else if (!q.has('nopop') && !sessionStorage.getItem('popup-seen')) {
      let shown = false;
      addEventListener('scroll', () => { if (!shown && scrollY > innerHeight * 0.8) { shown = true; sessionStorage.setItem('popup-seen', '1'); pop.classList.add('is-open'); } });
    }
    $('.popup-x', pop).onclick = () => pop.classList.remove('is-open');
    pop.addEventListener('click', (e) => { if (e.target === pop) pop.classList.remove('is-open'); });
  }

  // ——— главное меню ———
  const menu = $('#menu');
  const setMenu = (on) => { if (!menu) return; menu.classList.toggle('is-open', on); menu.setAttribute('aria-hidden', String(!on)); lock(on); };
  const mo = $('#menu-open');
  if (mo) mo.onclick = () => setMenu(true);
  if (menu) $$('[data-close]', menu).forEach((el) => { el.onclick = () => setMenu(false); });
  if (q.has('menu') && menu) { document.body.classList.add('popup-mode'); menu.classList.add('is-static'); staticMode = true; setMenu(true); }
  const lang = $('[data-lang]');
  if (lang) {
    const list = lang.nextElementSibling;
    lang.onclick = () => { list.hidden = !list.hidden; };
    $('[data-lang-en]', list).onclick = () => { list.hidden = true; toast('Английская версия появится позже'); };
    $('button.is-on', list).onclick = () => { list.hidden = true; };
  }

  // ——— корзина ———
  let cart = store.get(KEY, []).filter((i) => SHOP[i.id]);
  const unitPrice = (i) => (i.pack === 6 ? Math.round(SHOP[i.id].price * 6 * 0.9 / 10) * 10 : SHOP[i.id].price);
  const count = () => cart.reduce((s, i) => s + i.qty * (i.pack || 1), 0);
  const bottles = () => cart.filter((i) => !SHOP[i.id].kind || SHOP[i.id].kind === 'trio').reduce((s, i) => s + i.qty * (i.pack || 1) * (SHOP[i.id].kind === 'trio' ? 3 : 1), 0);
  const sub = () => cart.reduce((s, i) => s + i.qty * unitPrice(i), 0);
  const shipCost = { courier: 390, pickup: 190, shop: 0 };
  const delivery = () => { if (!cart.length || bottles() >= 2) return 0; const r = document.querySelector('input[name=ship]:checked'); return r ? shipCost[r.value] : 390; };
  document.addEventListener('change', (e) => { if (e.target.name === 'ship') render(); });
  const save = () => { store.set(KEY, cart); render(); };
  const add = (id, pack = 1, qty = 1) => {
    if (!SHOP[id]) return;
    const f = cart.find((i) => i.id === id && (i.pack || 1) === pack);
    if (f) f.qty += qty; else cart.push({ id, pack, qty });
    save();
  };
  const itemHTML = (i, idx, ro) => {
    const p = SHOP[i.id];
    const extra = p.kind ? ' ci-img-extra' : '';
    const unit = i.pack === 6 ? 'Набор из 6 · 750 мл' : p.unit.replace('&nbsp;', ' ');
    const right = ro
      ? `<span class="ci-x">× ${i.qty}</span><span class="ci-price">${rub(i.qty * unitPrice(i))}</span>`
      : `<span class="ci-price">${rub(i.qty * unitPrice(i))}</span><button class="ci-del" data-del="${idx}"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>Удалить</button>`;
    const qty = ro ? '' : `<span class="qty"><button data-dec="${idx}" aria-label="Меньше"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button><span>${i.qty}</span><button data-inc="${idx}" aria-label="Больше"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></span>`;
    return `<li class="ci"><a href="${p.url}" class="ci-img${extra}" style="background:linear-gradient(${p.grad})"><img src="${p.img}" alt=""></a>
      <div><a href="${p.url}" class="ci-name">${p.name}</a><span class="ci-unit">${unit}</span>${qty}</div>
      <div class="ci-right">${right}</div></li>`;
  };
  function render() {
    const n = count();
    $$('[data-cart-count]').forEach((b) => { b.textContent = n ? n : ''; });
    $$('[data-cart-count-text]').forEach((b) => { b.textContent = n ? `${n} ${plural(n, 'товар', 'товара', 'товаров')}` : ''; });
    $$('[data-cart-list]').forEach((ul) => { ul.innerHTML = cart.map((i, idx) => itemHTML(i, idx, ul.hasAttribute('data-readonly'))).join(''); ul.hidden = !cart.length; });
    $$('[data-cart-empty]').forEach((el) => { el.hidden = !!cart.length; });
    $$('[data-cart-foot]').forEach((el) => { el.hidden = !cart.length; });
    const b = bottles();
    $$('[data-ship-text]').forEach((el) => { el.textContent = !cart.length ? 'Бесплатная доставка от 2 бутылок' : b >= 2 ? 'Доставка бесплатная' : 'Добавьте ещё 1 бутылку — доставка будет бесплатной'; });
    $$('[data-ship-fill]').forEach((el) => { el.style.width = Math.min(100, b * 50) + '%'; });
    $$('[data-cart-sub]').forEach((el) => { el.textContent = rub(sub()); });
    $$('[data-cart-delivery]').forEach((el) => { el.textContent = delivery() ? rub(delivery()) : 'Бесплатно'; });
    $$('[data-cart-total]').forEach((el) => { el.textContent = rub(sub() + delivery()); });
    $$('[data-checkout-btn]').forEach((el) => { el.classList.toggle('btn-grey', !cart.length); });
    $$('[data-ship-p]').forEach((el) => { if (!el.dataset.base) el.dataset.base = el.innerHTML; el.innerHTML = cart.length && b >= 2 ? 'Бесплатно' : el.dataset.base; });
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-inc],[data-dec],[data-del]');
    if (!t) return;
    const idx = +(t.dataset.inc ?? t.dataset.dec ?? t.dataset.del);
    if (t.dataset.inc !== undefined) cart[idx].qty++;
    else if (t.dataset.dec !== undefined) { cart[idx].qty--; if (cart[idx].qty < 1) cart.splice(idx, 1); }
    else cart.splice(idx, 1);
    save();
  });
  const drawer = $('#cart');
  const setCart = (on) => { if (!drawer) return; drawer.classList.toggle('is-open', on); drawer.setAttribute('aria-hidden', String(!on)); lock(on); };
  $$('[data-cart-open]').forEach((b) => { b.onclick = () => { setMenu(false); setCart(true); }; });
  $$('[data-cart-close]').forEach((b) => { b.onclick = () => setCart(false); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b || !SHOP[b.dataset.add]) return;
    e.preventDefault();
    let pack = 1;
    if (b.hasAttribute('data-add-pack')) { const on = $('.pills .pill.is-on'); pack = on ? +on.dataset.pack : 1; }
    add(b.dataset.add, pack);
    setCart(true);
  });
  // ?demo — корзина с примером заказа (кадры страниц корзины и оформления)
  if ((q.has('cart') || q.has('demo')) && !cart.length) { cart = [{ id: 'klyukva', pack: 1, qty: 1 }, { id: 'yudzu', pack: 1, qty: 2 }]; save(); }
  if (q.has('cart') && drawer) { frameMode(drawer); setCart(true); }

  // ——— ИИ-консьерж ———
  const ai = $('#concierge');
  if (ai) {
    const log = $('[data-ai-log]', ai);
    const status = $('[data-ai-status]', ai);
    const L = (k) => LINKS[k] || '#';
    const greet = 'Здравствуйте! Я Вера, ИИ-консьерж. Помогу выбрать вкус, подобрать коктейль или подарок.';
    const answers = [
      [/подар|набор/i, () => `Для подарка лучше всего подойдёт <a href="${L('shop')}">набор «Трио»</a>: клюква, юдзу и манго. К нему можно добавить книгу рецептов.`],
      [/коктейл|рецепт|пригот|смеш/i, () => `Попробуйте <a href="${L('recipe-spritz-klyukva')}">клюквенный спритц</a>: 40 мл основы, 120 мл тоника и лёд. Другие идеи — в разделе <a href="${L('recipes')}">рецептов</a>.`],
      [/купить|где|магазин|озон|ozon|wb|маркет/i, () => `Основы есть на Ozon, Wildberries и Яндекс Маркете, а ещё в нашем <a href="${L('shop')}">каталоге</a> с доставкой. Адреса магазинов — на странице <a href="${L('where')}">«Где найти»</a>.`],
      [/достав|курьер|самовывоз/i, () => 'Доставляем курьером по Москве на следующий день и в пункты выдачи по всей России. От 2 бутылок доставка бесплатная.'],
      [/бар|ресторан|кофейн|опт|заведен/i, () => `Для заведений у нас оптовые цены и обучение барменов. Оставьте заявку на странице <a href="${L('horeca')}">«Для заведений»</a>.`],
      [/сахар|состав|калор|алког/i, () => 'В основах нет алкоголя, консервантов и красителей. Основа концентрированная: разбавляйте 1 к 4 тоником, содовой или водой.'],
    ];
    const say = (t, me) => { const d = document.createElement('div'); d.className = 'msg' + (me ? ' me' : ''); d.innerHTML = t; log.appendChild(d); log.scrollTop = log.scrollHeight; };
    const reply = (t, instant) => {
      const hit = answers.find(([re]) => re.test(t));
      const text = hit ? hit[1]() : 'Хороший вопрос! Расскажите, для какого случая нужен напиток, — подскажу вкус и рецепт.';
      if (instant) { say(text); return; }
      const ty = document.createElement('div'); ty.className = 'msg typing'; ty.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(ty); log.scrollTop = log.scrollHeight; status.textContent = 'Печатает…';
      setTimeout(() => { ty.remove(); status.textContent = 'В сети'; say(text); }, 900);
    };
    const reset = () => { log.innerHTML = ''; say(greet); };
    const setAi = (on) => { ai.classList.toggle('is-open', on); ai.setAttribute('aria-hidden', String(!on)); lock(on); if (on && !log.children.length) reset(); };
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-concierge]'); if (b) { e.preventDefault(); setMenu(false); setAi(true); } });
    $$('[data-ai-close]', ai).forEach((b) => { b.onclick = () => setAi(false); });
    $('[data-ai-reset]', ai).onclick = reset;
    $$('[data-ai-ask]', ai).forEach((b) => { b.onclick = () => { say(b.dataset.aiAsk, true); reply(b.dataset.aiAsk); }; });
    $('[data-ai-form]', ai).onsubmit = (e) => { e.preventDefault(); const inp = $('input', e.target); const v = inp.value.trim(); if (!v) return; inp.value = ''; say(v.replace(/</g, '&lt;'), true); reply(v); };
    if (q.has('ai')) { frameMode(ai); setAi(true); say('Какой коктейль приготовить?', true); reply('коктейль', true); }
  }

  // ——— модальные окна ———
  const modal = $('#modal');
  const openModal = (tpl) => {
    if (!modal) return;
    const body = $('[data-modal-body]', modal);
    body.innerHTML = '';
    body.appendChild($('#tpl-' + tpl).content.cloneNode(true));
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); lock(true);
    bindForms(body); bindToggles(body);
    const rate = $('[data-rate]', body);
    if (rate) $$('button', rate).forEach((b) => { b.onclick = () => $$('button', rate).forEach((x) => x.classList.toggle('is-on', +x.dataset.v <= +b.dataset.v)); });
  };
  const closeModal = () => { if (!modal) return; modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); lock(false); };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-modal-close]')) { closeModal(); return; }
    const b = e.target.closest('[data-ebook],[data-review],[data-cookie]');
    if (!b) return;
    e.preventDefault();
    openModal(b.hasAttribute('data-ebook') ? 'ebook' : b.hasAttribute('data-review') ? 'review' : 'cookie');
  });
  if (q.get('modal') && modal) { frameMode(modal); openModal(q.get('modal')); }

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    setMenu(false); setCart(false); closeModal(); closeF();
    if (ai) { ai.classList.remove('is-open'); lock(false); }
  });

  // переключатели
  function bindToggles(root = document) { $$('[data-tgl]', root).forEach((t) => { t.onclick = () => t.classList.toggle('is-on'); }); }
  bindToggles();

  // ——— формы: проверка, «серая» кнопка до заполнения, успех ———
  const valid = (f) => $$('input[required],select[required],textarea[required]', f).every((i) => (i.type === 'checkbox' ? i.checked : i.value.trim() && i.checkValidity()));
  function bindForms(root = document) {
    $$('form[data-form]', root).forEach((f) => {
      if (f.dataset.bound) return; f.dataset.bound = '1';
      const btn = $('button[type=submit]', f) || $('.btn', f);
      const upd = () => { if (btn && btn.classList.contains('btn-grey')) btn.classList.toggle('is-ready', valid(f)); };
      f.addEventListener('input', upd); f.addEventListener('change', upd);
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const bad = $$('input[required],select[required],textarea[required]', f).filter((i) => (i.type === 'checkbox' ? !i.checked : !i.value.trim() || !i.checkValidity()));
        $$('.is-bad', f).forEach((i) => i.classList.remove('is-bad'));
        const e1 = $('[name=email]', f), e2 = $('[name=email2]', f);
        if (e1 && e2 && e1.value !== e2.value) bad.push(e2);
        if (bad.length) { bad.forEach((i) => i.classList.add('is-bad')); toast(bad.some((i) => i.type === 'checkbox') && bad.length === 1 ? 'Отметьте согласие' : 'Заполните отмеченные поля'); return; }
        done(f);
      });
    });
  }
  function done(f) {
    const kind = f.dataset.form;
    if (kind === 'join' || kind === 'popup') { f.reset(); toast('Готово! Промокод на −10 % отправили на почту'); if (kind === 'popup') pop.classList.remove('is-open'); return; }
    if (kind === 'ebook') { closeModal(); toast('Книга отправлена на почту'); return; }
    if (kind === 'review') { closeModal(); toast('Спасибо! Отзыв появится после проверки'); return; }
    if (kind === 'profile') { toast('Данные сохранены'); return; }
    if (kind === 'login') { const email = $('[name=email]', f).value; const name = ($('[name=name]', f) || {}).value || email.split('@')[0]; store.set('bravis-user', { email, name }); location.href = LINKS.account || 'account.html'; return; }
    if (kind === 'checkout') {
      const no = 'B-' + String(Date.now()).slice(-6);
      const orders = store.get('bravis-orders', []);
      orders.unshift({ no, date: new Date().toLocaleDateString('ru-RU'), sum: sub() + delivery(), n: count() });
      store.set('bravis-orders', orders);
      cart = []; save();
      $('.co-main').hidden = true; $('.co-sum').hidden = true;
      const d = $('.co-done:not(.co-fail)'); d.hidden = false; $('[data-order-no]', d).textContent = '№ ' + no;
      scrollTo(0, 0);
      return;
    }
    f.hidden = true;
    const ok = f.nextElementSibling;
    if (ok && ok.classList.contains('form-done')) { ok.hidden = false; ok.scrollIntoView({ block: 'center' }); }
  }
  bindForms();
  // мультивыбор продуктов: подпись из выбранных
  $$('details.multi').forEach((d) => {
    const lab = $('[data-multi-label]', d); const def = lab.textContent;
    d.addEventListener('change', () => { const v = $$('input:checked', d).map((i) => i.value); lab.textContent = v.length ? v.join(', ') : def; });
  });
  $$('[data-promo]').forEach((b) => { b.onclick = () => toast('Промокод не найден'); });
  $$('[data-share]').forEach((b) => { b.onclick = () => { try { navigator.clipboard.writeText(location.href); } catch (e) {} toast('Ссылка скопирована'); }; });
  $$('[data-social]').forEach((b) => { b.onclick = () => toast('Вход через ' + b.textContent + ' появится позже'); });

  // ——— медиа-кнопки: пауза/звук ———
  const PAUSE = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/></svg>';
  const MUTE = '<svg viewBox="0 0 24 24"><path d="M5 10h3l4-3.5v11L8 14H5z"/><path d="m15.5 10 4 4m0-4-4 4"/></svg>';
  const SOUND = '<svg viewBox="0 0 24 24"><path d="M5 10h3l4-3.5v11L8 14H5z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M17.8 7.2a7 7 0 0 1 0 9.6"/></svg>';
  const setPlay = (b, paused) => { b.classList.toggle('is-paused', paused); b.innerHTML = paused ? PLAY : PAUSE; b.setAttribute('aria-label', paused ? 'Смотреть' : 'Пауза'); };
  $$('[data-play]').forEach((b) => {
    // если рядом настоящее видео (первый экран BRAVIS) — управляем им, иначе просто меняем значок
    const v = b.closest('section') && b.closest('section').querySelector('video');
    if (v) {
      v.addEventListener('play', () => setPlay(b, false));
      v.addEventListener('pause', () => setPlay(b, true));
      v.addEventListener('ended', () => setPlay(b, true));
      b.onclick = () => { if (v.paused || v.ended) { if (v.ended) v.currentTime = 0; v.play(); } else v.pause(); };
      if (v.paused && !v.autoplay) setPlay(b, true);
    } else b.onclick = () => setPlay(b, !b.classList.contains('is-paused'));
  });
  $$('[data-mute]').forEach((b) => {
    const v = b.closest('section') && b.closest('section').querySelector('video');
    b.onclick = () => {
      const on = b.classList.toggle('is-sound'); b.innerHTML = on ? SOUND : MUTE;
      if (v) { v.muted = !on; if (on && (v.paused || v.ended)) { if (v.ended) v.currentTime = 0; v.play(); } }
    };
  });

  // ——— карточка товара: галерея, упаковка, аккордеон, отзывы ———
  const gal = $('[data-gallery]');
  if (gal) {
    const slides = $$('.g-stage > .g-slide', gal), ths = $$('.g-th', gal), cur = $('[data-cur]', gal);
    let i = 0;
    const go = (n) => { i = (n + slides.length) % slides.length; slides.forEach((s, k) => s.classList.toggle('is-on', k === i)); ths.forEach((t, k) => t.classList.toggle('is-on', k === i)); cur.textContent = i + 1; };
    $('[data-prev]', gal).onclick = () => go(i - 1);
    $('[data-next]', gal).onclick = () => go(i + 1);
    ths.forEach((t) => { t.onclick = () => go(+t.dataset.go); });
    go(0);
  }
  $$('.pills .pill').forEach((p) => {
    p.onclick = () => { $$('.pills .pill').forEach((x) => x.classList.toggle('is-on', x === p)); const out = $('[data-price-out]'); if (out) out.textContent = rub(+p.dataset.price); };
  });
  $$('[data-acc] > .acc-h').forEach((h) => { h.onclick = () => h.parentElement.classList.toggle('is-open'); });
  $$('[data-tab]').forEach((t) => {
    t.onclick = () => { $$('[data-tab]').forEach((x) => x.classList.toggle('is-on', x === t)); $$('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== t.dataset.tab; }); };
  });
  $$('[data-help]').forEach((b) => { b.onclick = () => { if (b.classList.contains('is-on')) return; b.classList.add('is-on'); const s = $('span', b); s.textContent = +s.textContent + 1; }; });

  // ——— фильтры и сортировка (рецепты, журнал) ———
  const fd = $('#filters');
  function closeF() { if (fd) { fd.classList.remove('is-open'); lock(false); } }
  if (fd) {
    const list = $('[data-filter-list]'), cards = $$('[data-flavor]', list);
    const order = cards.slice();
    const sel = () => $$('[data-fpane=filter] input:checked', fd).map((i) => i.value);
    const shown = () => { const s = sel(); return cards.filter((c) => !s.length || s.includes(c.dataset.flavor)); };
    const upd = () => { $('[data-fcount]', fd).textContent = shown().length; };
    const openF = (pane) => {
      $$('[data-fpane]', fd).forEach((p) => { p.hidden = p.dataset.fpane !== pane; });
      $('[data-ftitle]', fd).textContent = pane === 'sort' ? 'Сортировка' : 'Фильтры';
      fd.classList.add('is-open'); lock(true);
    };
    $$('[data-fopen]').forEach((b) => { b.onclick = () => openF(b.dataset.fopen); });
    $$('[data-fclose]', fd).forEach((b) => { b.onclick = closeF; });
    fd.addEventListener('change', upd);
    $('[data-freset]', fd).onclick = () => { $$('input[type=checkbox]', fd).forEach((i) => { i.checked = false; }); $('input[value=pop]', fd).checked = true; upd(); };
    $('[data-fapply]', fd).onclick = () => {
      const s = shown(); cards.forEach((c) => { c.hidden = !s.includes(c); });
      const how = $('input[name=sort]:checked', fd).value;
      const sorted = how === 'az' ? cards.slice().sort((a, b) => a.dataset.name.localeCompare(b.dataset.name, 'ru')) : how === 'new' ? order.slice().reverse() : order;
      sorted.forEach((c) => list.appendChild(c));
      $('[data-empty]').hidden = !!s.length;
      $$('[data-fopen]').forEach((b) => b.classList.toggle('is-active', b.dataset.fopen === 'filter' ? sel().length > 0 : how !== 'pop'));
      closeF(); scrollTo({ top: list.getBoundingClientRect().top + scrollY - 140, behavior: 'smooth' });
    };
    if (q.has('filters')) { frameMode(fd); $$('[data-fpane=filter] input', fd)[0].checked = true; upd(); openF('filter'); }
  }

  // ——— где найти: вкладки, поиск, точки на карте ———
  const ll = $('[data-loc-list]');
  if (ll) {
    const locs = $$('.loc', ll), pins = $$('.pin');
    let tab = 'all';
    const pick = (i) => { locs.forEach((l) => l.classList.toggle('is-on', l.dataset.i === String(i))); pins.forEach((p) => p.classList.toggle('is-on', p.dataset.i === String(i))); };
    const apply = () => {
      const s = $('[data-loc-q]').value.trim().toLowerCase();
      locs.forEach((l) => { l.hidden = (tab !== 'all' && l.dataset.kind !== tab) || (s && !l.textContent.toLowerCase().includes(s)); });
      pins.forEach((p) => { const l = locs[+p.dataset.i]; p.classList.toggle('is-dim', l.hidden); });
    };
    locs.forEach((l) => { l.onclick = () => pick(l.dataset.i); l.onkeydown = (e) => { if (e.key === 'Enter') pick(l.dataset.i); }; });
    pins.forEach((p) => { p.onclick = () => { pick(p.dataset.i); locs[+p.dataset.i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
    $$('[data-loc-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.locTab; $$('[data-loc-tab]').forEach((x) => x.classList.toggle('is-on', x === b)); apply(); }; });
    $('[data-loc-q]').addEventListener('input', apply);
    pick(3);
  }

  // ——— правовая информация: подсветка раздела ———
  const ln = $('.legal-nav');
  if (ln) {
    const mark = () => { const h = location.hash.slice(1) || 'terms'; $$('a', ln).forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#' + h)); };
    addEventListener('hashchange', mark); mark();
    if (location.hash === '#cookie' && !q.has('nomodal')) setTimeout(() => openModal('cookie'), 300);
  }

  // ——— вход и кабинет ———
  const user = store.get('bravis-user', null) || (q.has('demo') ? { name: 'Анна', email: 'anna@mail.ru' } : null);
  if (user) {
    $$('[data-account]').forEach((a) => { if (a.tagName === 'A') a.href = LINKS.account || a.href; });
    $$('[data-account-label]').forEach((s) => { s.textContent = 'Личный кабинет'; });
  }
  $$('[data-auth]').forEach((t) => {
    t.onclick = () => {
      const up = t.dataset.auth === 'up';
      $$('[data-auth]').forEach((x) => x.classList.toggle('is-on', x === t));
      $$('[data-only]').forEach((el) => { el.hidden = el.dataset.only !== t.dataset.auth; });
      $('[data-auth-btn]').textContent = up ? 'Создать аккаунт' : 'Войти';
    };
  });
  const orders = $('[data-orders]');
  if (orders) {
    if (!user && !q.has('demo')) { location.replace(LINKS.login || 'login.html'); return; }
    const nm = $('[data-user-name]'); if (nm && user) nm.textContent = user.name;
    const list = store.get('bravis-orders', []).concat([{ no: 'B-418207', date: '14.08.2026', sum: 2661, n: 3, st: 'Доставлен' }, { no: 'B-396115', date: '02.07.2026', sum: 1774, n: 2, st: 'Доставлен' }]);
    orders.innerHTML = list.map((o) => `<li><div><b>Заказ № ${o.no}</b><span>${o.date} · ${o.n} ${plural(o.n, 'товар', 'товара', 'товаров')}</span></div><span class="o-st">${o.st || 'Собираем'}</span><span class="o-sum">${rub(o.sum)}</span></li>`).join('');
    $$('[data-acct]').forEach((b) => { b.onclick = () => { $$('[data-acct]').forEach((x) => x.classList.toggle('is-on', x === b)); $$('[data-acct-pane]').forEach((p) => { p.hidden = p.dataset.acctPane !== b.dataset.acct; }); }; });
    $('[data-logout]').onclick = () => { try { localStorage.removeItem('bravis-user'); } catch (e) {} location.href = LINKS.index || 'index.html'; };
  }
  // ?done — кадр «заказ оформлен», ?payfail — «оплата не прошла» (кадры для Figma и показ сценария ошибки)
  const coShow = (sel) => {
    $('.co-main').hidden = true; $('.co-sum').hidden = true;
    $$('.co > .co-done').forEach((d) => { d.hidden = !d.matches(sel); });
    const d = $(sel); $$('[data-order-no]', d).forEach((el) => { el.textContent = '№ B-520413'; }); scrollTo(0, 0);
  };
  if ($('.co-done')) {
    if (q.has('done')) coShow('.co-done:not(.co-fail)');
    if (q.has('payfail')) coShow('.co-fail');
    $$('[data-pay-retry]').forEach((b) => { b.onclick = () => { b.disabled = true; b.textContent = 'Проводим оплату…'; setTimeout(() => { b.disabled = false; b.textContent = 'Попробовать ещё раз'; coShow('.co-done:not(.co-fail)'); }, 1200); }; });
    $$('[data-pay-back]').forEach((b) => { b.onclick = () => { $$('.co > .co-done').forEach((d) => { d.hidden = true; }); $('.co-main').hidden = false; $('.co-sum').hidden = false; const h = $$('.co-h')[2]; if (h) h.scrollIntoView({ block: 'start' }); }; });
  }

  render();
})();
