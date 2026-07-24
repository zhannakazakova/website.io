/*
 * Согласие на обработку персональных данных для форм заявок.
 * Подключение одним тегом:
 *   <script src="js/consent.js" defer></script>
 *
 * Добавляет к «большим» формам (с textarea / 2+ полями — т.е. формам заявок):
 *   - обязательную галочку "Я даю согласие на обработку персональных данных";
 *   - ссылку, открывающую всплывающее окно с полным текстом согласия.
 * Без отмеченной галочки браузер не даст отправить форму (атрибут required).
 *
 * Отключить на конкретной форме: <form data-consent="off"> ... </form>
 */
(function () {
  'use strict';

  var STYLE = `
    .consent-row { display:flex; align-items:flex-start; gap:10px; margin:6px 0 18px;
      font-family:"Poppins",sans-serif; font-size:14px; color:#707070; line-height:1.5; cursor:pointer; }
    .consent-row input[type="checkbox"] { width:18px; height:18px; margin-top:1px; flex:none;
      accent-color:#dfa667; cursor:pointer; }
    .consent-row a { color:#dfa667; text-decoration:underline; }
    .consent-overlay { position:fixed; inset:0; z-index:9999; display:none;
      align-items:center; justify-content:center; padding:20px;
      background:rgba(17,17,17,.6); backdrop-filter:blur(3px); }
    .consent-overlay.open { display:flex; }
    .consent-modal { background:#fff; max-width:560px; width:100%; max-height:85vh; overflow:auto;
      border-radius:10px; padding:32px 34px; box-shadow:0 20px 60px rgba(0,0,0,.3);
      font-family:"Poppins",sans-serif; animation:consentIn .2s ease; }
    @keyframes consentIn { from{opacity:0; transform:translateY(12px)} to{opacity:1; transform:none} }
    .consent-modal h3 { margin:0 0 16px; font-size:22px; color:#111; text-transform:uppercase; }
    .consent-modal p { font-size:14px; color:#555; line-height:1.7; margin:0 0 14px; }
    .consent-modal a { color:#dfa667; }
    .consent-modal .consent-close { margin-top:10px; background:#dfa667; color:#fff; border:none;
      padding:12px 32px; border-radius:4px; font-size:15px; font-weight:600; cursor:pointer;
      font-family:inherit; }
    .consent-modal .consent-close:hover { filter:brightness(1.06); }
  `;

  var MODAL_HTML =
    '<div class="consent-modal" role="dialog" aria-modal="true" aria-label="Согласие на обработку персональных данных">' +
      '<h3>Согласие на обработку персональных данных</h3>' +
      '<p>Отправляя форму на сайте <b>zhanna-kazakova.ru</b>, я свободно, своей волей и в своём интересе ' +
        'даю согласие оператору — Индивидуальному предпринимателю Казаковой Жанне Николаевне ' +
        '(ИНН 245905918365, ОГРНИП 321703100044236) — на обработку моих персональных данных.</p>' +
      '<p>Обрабатываются данные, которые я указываю в форме: имя (ФИО), номер телефона, адрес ' +
        'электронной почты и текст обращения. Цель обработки — обратная связь, консультация и ' +
        'оказание услуг по дизайну интерьера.</p>' +
      '<p>Обработка включает сбор, запись, хранение, использование, передачу сервису приёма заявок ' +
        '(Formspree) и удаление данных. Согласие действует до его отзыва, который можно направить ' +
        'на e-mail <a href="mailto:interior.kazakova@yandex.ru">interior.kazakova@yandex.ru</a>.</p>' +
      '<p>Подробнее — в <a href="privacy.html" target="_blank">Политике конфиденциальности</a>.</p>' +
      '<button type="button" class="consent-close">Понятно</button>' +
    '</div>';

  var overlay = null;

  function injectStyles() {
    if (document.getElementById('consent-style')) return;
    var s = document.createElement('style');
    s.id = 'consent-style';
    s.textContent = STYLE;
    (document.head || document.documentElement).appendChild(s);
  }

  function buildModal() {
    if (overlay) return;
    injectStyles();
    overlay = document.createElement('div');
    overlay.className = 'consent-overlay';
    overlay.innerHTML = MODAL_HTML;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('consent-close')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  function open(e) {
    if (e) e.preventDefault();
    buildModal();
    overlay.classList.add('open');
  }
  function close() { if (overlay) overlay.classList.remove('open'); }

  function isSmallForm(form) {
    if (form.querySelector('textarea')) return false;
    var n = 0, inp = form.querySelectorAll('input');
    for (var i = 0; i < inp.length; i++) {
      var t = (inp[i].type || 'text').toLowerCase();
      if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'file'].indexOf(t) === -1) n++;
    }
    return n <= 1;
  }

  function attach(form) {
    if (!form || form.__consentInit) return;
    if (form.dataset.consent === 'off') return;
    if (isSmallForm(form)) return;           // только формы заявок
    form.__consentInit = true;
    injectStyles();

    var row = document.createElement('label');
    row.className = 'consent-row';
    row.innerHTML =
      '<input type="checkbox" name="consent" value="yes" required>' +
      '<span>Я даю <a href="#" class="consent-link">согласие на обработку ' +
      'персональных данных</a></span>';

    var submit = form.querySelector('[type="submit"], button:not([type="button"])');
    if (submit && submit.parentNode) submit.parentNode.insertBefore(row, submit);
    else form.appendChild(row);

    row.querySelector('.consent-link').addEventListener('click', open);
  }

  function scan(root) { (root || document).querySelectorAll('form').forEach(attach); }

  function init() {
    scan(document);
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.tagName === 'FORM') attach(n);
            if (n.querySelectorAll) scan(n);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
