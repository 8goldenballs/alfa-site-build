/* Подбор по признакам — задача 167б.
 *
 * Механизм без смысла предметной области — переносится как есть:
 *   form[data-podbor]       — форма GET с полями select; имя поля = признак
 *   [data-podbor-item]      — правило; у него data-<имя поля> — значения
 *                             через пробел, «any» подходит любому выбору
 *   [data-podbor-group]     — раздел правил, прячется, когда пуст
 *   [data-podbor-result]    — строка статуса (aria-live)
 *   [data-podbor-empty]     — сообщение «ничего не подошло»
 *
 * SEO25: все правила уже в разметке, скрипт МЕНЯЕТ ТОЛЬКО ВИДИМОСТЬ.
 * Без скрипта форма уходит GET на ту же страницу, и виден весь список.
 *
 * SEO5: выбор в адрес не пишется. Пришли по адресу с параметрами (форма
 * без скрипта, пересланная ссылка) — поля выставляются из адреса.
 */
(function () {
  'use strict';

  var form = document.querySelector('form[data-podbor]');
  if (!form) return;

  var fields = form.querySelectorAll('select[name]');
  var items = document.querySelectorAll('[data-podbor-item]');
  var groups = document.querySelectorAll('[data-podbor-group]');
  var result = document.querySelector('[data-podbor-result]');
  var empty = document.querySelector('[data-podbor-empty]');

  function has(list, value) {
    var s = ' ' + (list || '') + ' ';
    return s.indexOf(' any ') !== -1 || s.indexOf(' ' + value + ' ') !== -1;
  }

  function apply() {
    var shown = 0;
    var chosen = false;

    for (var i = 0; i < items.length; i++) {
      var match = true;
      for (var j = 0; j < fields.length; j++) {
        var v = fields[j].value;
        if (!v) continue;
        chosen = true;
        if (!has(items[i].getAttribute('data-' + fields[j].name), v)) { match = false; break; }
      }
      // Нативный hidden: прячет и от программ чтения с экрана
      items[i].hidden = !match;
      if (match) shown++;
    }

    for (var k = 0; k < groups.length; k++) {
      groups[k].hidden = !groups[k].querySelector('[data-podbor-item]:not([hidden])');
    }

    if (empty) empty.hidden = shown > 0;
    // Сообщение в область с aria-live: иначе программа чтения не скажет,
    // что выдача сменилась
    if (result) result.textContent = chosen ? 'Подходит вариантов: ' + shown + ' из ' + items.length : '';
  }

  // Выбор из адреса — только значения, которые есть в списке
  var params = new URLSearchParams(location.search);
  for (var f = 0; f < fields.length; f++) {
    var value = params.get(fields[f].name);
    if (value && fields[f].querySelector('option[value="' + CSS.escape(value) + '"]')) fields[f].value = value;
  }
  apply();

  form.addEventListener('change', apply);

  // Со скриптом страница не перезагружается: выдача уже сменилась, остаётся
  // показать её начало. Плавность — только без сниженного движения (Mt2)
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    apply();
    var target = result && result.closest('section');
    if (target) {
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    }
  });

  // reset меняет поля после события — пересчёт следующим шагом
  form.addEventListener('reset', function () { setTimeout(apply, 0); });
})();
