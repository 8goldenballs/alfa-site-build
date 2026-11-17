/* Фильтр каталога по категориям.
 *
 * SEO25: все позиции уже в разметке, скрипт МЕНЯЕТ ТОЛЬКО ВИДИМОСТЬ.
 * Ничего не дорисовывает и ничего не подгружает — иначе часть каталога
 * не попадёт в индекс.
 *
 * Обычный скрипт, не остров (A1): переключение видимости не требует
 * фреймворка. Без скриптов виден весь список — это рабочее состояние
 * страницы, а не поломка.
 *
 * ⚠️ SEO5: состояние фильтра НЕ пишется в адрес страницы. Иначе появятся
 * дубли с параметрами, которые придётся закрывать директивой очистки.
 */
(function () {
  'use strict';

  var filter = document.querySelector('.filter');
  var list = document.querySelector('.products');
  if (!filter || !list) return;

  var chips = filter.querySelectorAll('[data-filter]');
  var products = list.querySelectorAll('.product');
  var result = document.querySelector('.result');
  // Тот же скрипт фильтрует объекты (/proekty/) и блог: там подпись своя,
  // в атрибуте data-label. Без атрибута — каталожная
  var label = (result && result.getAttribute('data-label')) || 'Показано позиций';

  function apply(value) {
    var shown = 0;

    for (var i = 0; i < products.length; i++) {
      var item = products[i];
      // Значений может быть несколько через пробел: статья блога
      // помечена двумя-тремя услугами (задача 84). У позиции каталога
      // и объекта значение одно — для них это то же равенство
      var match = value === 'all'
        || (' ' + item.getAttribute('data-category') + ' ').indexOf(' ' + value + ' ') !== -1;
      // Нативный hidden, а не свой атрибут с правилом в стилях.
      // Три причины: браузер прячет сам, правило в CSS не нужно вовсе;
      // элемент скрывается и от программ чтения с экрана, то есть
      // отфильтрованное не зачитывается; и нечему разъехаться между
      // скриптом и стилями.
      //
      // ⚠️ Работает, пока у .product не задан display явно: display
      // в авторских стилях перебивает hidden из стилей браузера
      item.hidden = !match;
      if (match) shown++;
    }

    for (var j = 0; j < chips.length; j++) {
      var on = chips[j].getAttribute('data-filter') === value;
      chips[j].setAttribute('aria-pressed', on ? 'true' : 'false');
      chips[j].classList.toggle('is-on', on);
    }

    // Сообщение в область с aria-live: пользователь программы чтения
    // с экрана иначе не узнает, что список изменился
    if (result) {
      if (value === 'all') {
        result.textContent = '';
      } else {
        result.textContent = label + ': ' + shown + ' из ' + products.length;
      }
    }
  }

  filter.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-filter]');
    if (!chip) return;
    apply(chip.getAttribute('data-filter'));
    keepTop();
  });

  // Ряд прилип, человек листал вниз и выбрал категорию: список стал короче,
  // и страница оставалась на середине результатов — начала выдачи не видно
  // за рядом. Верх списка встаёт под ряд. Список и так ниже ряда (первый экран,
  // телефон, где ряд не прилипает) — страница не двигается
  function keepTop() {
    if (getComputedStyle(filter).position !== 'sticky') return;
    // Низ прилипшего ряда — от шапки и высоты ряда: сам ряд после сжатия
    // страницы мог быть вытолкнут вверх, по его положению считать нельзя
    var bar = headerH() + filter.getBoundingClientRect().height + 16;
    var delta = list.getBoundingClientRect().top - bar;
    if (delta < 0) window.scrollBy(0, delta);
  }

  // ── Задача 166б (Марат 02.11, запись 29): фильтр при прокрутке ──
  //
  // Компьютер: ряд прилипает под шапкой стилями страницы. Отсюда — только
  // отступ прокрутки под него: без него Tab по карточкам ставил бы фокус под
  // прилипший ряд (Mp10, 2.4.11). Пока ряд прилип, высота — в --filter-h у
  // <html>, base.css прибавляет её к отступу под шапку; не прилип (первый
  // экран, конец списка) — переменной нет, и якоря не получают лишнего поля.
  //
  // Телефон: ряд не прилипает. Кнопка «Фильтр» показывается, когда ряд ушёл
  // вверх за окно, а карточки ещё в окне, и возвращает к ряду с фокусом на
  // нажатой кнопке. Без скрипта кнопка остаётся скрытой (hidden в разметке)
  var jump = document.querySelector('[data-filter-jump]');
  var root = document.documentElement;

  function headerH() {
    return parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 0;
  }

  if (jump) {
    var out = false;   // ряд ушёл вверх за окно
    var seen = false;  // карточки ещё в окне

    var sync = function () { jump.hidden = !(out && seen); };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var e = entries[entries.length - 1];
        out = !e.isIntersecting && e.boundingClientRect.bottom < 0;
        sync();
      }).observe(filter);

      new IntersectionObserver(function (entries) {
        seen = entries[entries.length - 1].isIntersecting;
        sync();
      }).observe(list);
    }

    jump.addEventListener('click', function () {
      // Шапка на телефоне уезжает при чтении и выезжает при прокрутке вверх:
      // ряд ставится под выехавшую шапку, а не под спрятанную
      var top = filter.getBoundingClientRect().top + window.scrollY - headerH() - 8;
      window.scrollTo(0, Math.max(top, 0));
      var on = filter.querySelector('[aria-pressed="true"]') || chips[0];
      if (on) {
        on.focus({ preventScroll: true });
        // Полоса кнопок на телефоне прокручивается: выбранная далёкая
        // категория не должна остаться за краем окна
        on.scrollIntoView({ block: 'nearest', inline: 'center' });
      }
    });
  }

  var wide = window.matchMedia('(min-width: 62rem)');
  var pending = false;

  function pin() {
    pending = false;
    var stuck = wide.matches && getComputedStyle(filter).position === 'sticky'
      && Math.abs(filter.getBoundingClientRect().top - headerH()) < 2;
    if (stuck) root.style.setProperty('--filter-h', Math.ceil(filter.getBoundingClientRect().height) + 'px');
    else root.style.removeProperty('--filter-h');
  }

  if (getComputedStyle(filter).position !== 'static' || wide.matches) {
    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(pin);
    }, { passive: true });
    window.addEventListener('resize', pin);
    pin();
  }
})();
