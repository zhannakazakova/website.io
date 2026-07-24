/*
 * Лёгкая анти-бот защита форм (для статического сайта + Formspree).
 * Подключение одним тегом на любой странице:
 *   <script src="js/captcha.js" defer></script>
 *
 * Что делает с каждой формой:
 *   1) honeypot — скрытое поле-ловушка с именем "_gotcha" (его нативно понимает
 *      Formspree и сам отбрасывает спам на сервере; плюс мы проверяем на клиенте);
 *   2) проверка времени — мгновенная отправка (< 2 c) считается ботом;
 *   3) мини-капча — простой пример "3 + 5 = ?" перед кнопкой.
 *
 * Режимы (атрибут на <form>):
 *   data-captcha="off"   — полностью отключить защиту на этой форме;
 *   data-captcha="lite"  — только honeypot + время, без видимого примера;
 *   data-captcha="full"  — принудительно показать пример.
 * Если атрибута нет — режим выбирается автоматически: у маленьких форм
 * (одно поле, как новостная подписка в футере) пример НЕ показывается,
 * у форм с textarea или 2+ полями — показывается.
 */
(function () {
  'use strict';

  var STYLE = `
    .cap-hp { position:absolute !important; left:-9999px !important; top:auto !important;
      width:1px; height:1px; overflow:hidden; opacity:0; }
    .cap-box { margin:12px 0 18px; padding:12px 16px; border:1px solid rgba(0,0,0,.12);
      border-radius:8px; background:#faf7f3; display:flex; flex-wrap:wrap;
      align-items:center; gap:10px; font-family:"Poppins",sans-serif; }
    .cap-q { font-size:15px; color:#111; }
    .cap-q b { font-size:16px; color:#111; }
    .cap-input { width:90px; padding:9px 11px; border:1px solid #e1e1e1;
      border-radius:6px; font-size:15px; font-family:inherit; color:#111; }
    .cap-input:focus { outline:none; border-color:#dfa667; }
    .cap-err { flex-basis:100%; color:#e23b4e; font-size:13px; }
    .cap-box.cap-bad .cap-input { border-color:#e23b4e; }
  `;

  function injectStyles() {
    if (document.getElementById('cap-style')) return;
    var s = document.createElement('style');
    s.id = 'cap-style';
    s.textContent = STYLE;
    (document.head || document.documentElement).appendChild(s);
  }

  // считаем «значимые» поля ввода, чтобы понять — большая форма или мини
  function isSmallForm(form) {
    if (form.querySelector('textarea')) return false;
    var fields = form.querySelectorAll('input');
    var count = 0;
    for (var i = 0; i < fields.length; i++) {
      var t = (fields[i].type || 'text').toLowerCase();
      if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'file'].indexOf(t) === -1) count++;
    }
    return count <= 1;
  }

  function protectForm(form) {
    if (!form || form.__capInit) return;
    var mode = form.dataset.captcha || '';
    if (mode === 'off') return;
    form.__capInit = true;

    var showQuiz = mode === 'full' ? true : (mode === 'lite' ? false : !isSmallForm(form));
    var startTime = Date.now();

    // 1) honeypot (_gotcha — нативная ловушка Formspree)
    var hp = document.createElement('div');
    hp.className = 'cap-hp';
    hp.setAttribute('aria-hidden', 'true');
    hp.innerHTML = '<label>Если вы человек — не заполняйте это поле' +
      '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></label>';
    form.appendChild(hp);

    var input = null, box = null, err = null, a = 0, b = 0;

    // 2) видимая мини-капча
    if (showQuiz) {
      a = 1 + Math.floor(Math.random() * 5);
      b = 1 + Math.floor(Math.random() * 5);
      box = document.createElement('div');
      box.className = 'cap-box';
      box.innerHTML =
        '<span class="cap-q">Подтвердите, что вы не робот: <b>' + a + ' + ' + b + ' = ?</b></span>' +
        '<input type="number" class="cap-input" inputmode="numeric" placeholder="ответ" autocomplete="off" aria-label="Ответ на проверку">' +
        '<span class="cap-err" role="alert"></span>';

      var submit = form.querySelector('[type="submit"], button:not([type="button"])');
      if (submit && submit.parentNode) submit.parentNode.insertBefore(box, submit);
      else form.appendChild(box);

      input = box.querySelector('.cap-input');
      err = box.querySelector('.cap-err');
      input.addEventListener('input', function () {
        err.textContent = '';
        box.classList.remove('cap-bad');
      });
    }

    function fail(msg) {
      if (err) { err.textContent = msg || ''; box.classList.add('cap-bad'); }
      else alert(msg || 'Проверка не пройдена');
    }

    // проверяем в capture-фазе — раньше любых обработчиков формы
    form.addEventListener('submit', function (e) {
      var hpField = form.querySelector('[name="_gotcha"]');
      if (hpField && hpField.value.trim() !== '') {     // ловушка сработала → бот
        e.preventDefault(); e.stopImmediatePropagation();
        return false;
      }
      if (Date.now() - startTime < 2000) {              // слишком быстро → бот
        e.preventDefault(); e.stopImmediatePropagation();
        fail('Слишком быстро — подождите пару секунд и попробуйте снова.');
        return false;
      }
      if (showQuiz && parseInt(input.value, 10) !== a + b) {  // неверный ответ
        e.preventDefault(); e.stopImmediatePropagation();
        fail('Неверный ответ на проверку. Решите пример заново.');
        input.focus();
        return false;
      }
      // всё ок — форма уходит как обычно (в т.ч. на Formspree)
    }, true);
  }

  function scan(root) {
    (root || document).querySelectorAll('form').forEach(protectForm);
  }

  function init() {
    injectStyles();
    scan(document);
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.tagName === 'FORM') protectForm(n);
            if (n.querySelectorAll) scan(n);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
