/* Улучшение меню. НЕ условие работы.
 *
 * Меню построено на <details> и работает без этого скрипта: раскрывается
 * и закрывается нажатием, доступно с клавиатуры нативно. Скрипт добавляет
 * три поведения, которых у <details> нет:
 *
 *   — закрытие по нажатию вне меню
 *   — закрытие, когда фокус ушёл из меню (задача 67)
 *   — закрытие по клавише Escape с возвратом фокуса на заголовок
 *
 * Без него меню остаётся открытым, пока не нажать заголовок повторно.
 * Это рабочее поведение, а не поломка: при переходе на другую страницу
 * оно закрывается само, потому что сайт статический.
 *
 * И ещё одно — не про меню, но про шапку: её высота в переменной
 * --header-h для отступа под закреплённую шапку (ниже, задача 67),
 * и шапка на телефоне, которая прячется при чтении (задача 94).
 * Ещё ссылки со страницы услуги в новой вкладке на компьютере (задача 71)
 * и появление блоков при прокрутке (задача 72) — в конце файла. Там же
 * окно просмотра сканов и снимков объектов (задача 102).
 *
 * Обычный скрипт, не остров (A1). Cv22: внешним файлом, инлайна нет.
 */
(function () {
  'use strict';

  /* Высота шапки — в --header-h у <html>. От неё в base.css отступ
   * scroll-padding-block-start: с точки lg шапка закреплена, и браузер,
   * докручивая фокус или якорь, ставит элемент под неё (Mp10, 2.4.11).
   *
   * ⚠️ Мерить, а не записывать числом. До задачи 67 отступ стоял числом
   * 73 + 8, а шапка растёт со шрифтом браузера: при «Крупном» (20 px)
   * она в две строки, 137 px, и обратный Tab уводил под неё 60 из 357
   * остановок, заголовок формы после «Оставить заявку» — тоже (аудит
   * 10.10, Д6). ResizeObserver ловит и шрифт, и ширину окна, и строку,
   * ушедшую на вторую.
   *
   * Без скрипта действует запасное число из base.css — высота при
   * обычном шрифте. Переменная меняет только отступ прокрутки и предел
   * высоты списка «Услуги», вёрстку не сдвигает */
  var header = document.querySelector('[data-site-header]');
  if (header && 'ResizeObserver' in window) {
    new ResizeObserver(function () {
      document.documentElement.style.setProperty('--header-h', Math.ceil(header.getBoundingClientRect().height) + 'px');
    }).observe(header);
  }

  /* Высота окна — в --view-h, для предела раскрытого меню на телефоне
   * (задача 94, Header.astro). innerHeight — окно, какое оно сейчас:
   * со строкой адреса или без, у vh оно всегда без неё */
  function viewHeight() {
    document.documentElement.style.setProperty('--view-h', window.innerHeight + 'px');
  }
  viewHeight();
  window.addEventListener('resize', viewHeight);

  var menus = document.querySelectorAll('[data-menu], [data-sub]');
  if (!menus.length) return;

  /* Внешнее меню приходит ЗАКРЫТЫМ (Header.astro): на узком экране это
   * обычный сложенный <details>, на широком его содержимое показывают
   * стили. Здесь блок открывается там, где заголовок-значок ☰ скрыт, —
   * то есть на широком экране. Видимо ничего не меняется, зато признак
   * open совпадает с тем, что на экране, и на него опираются Escape
   * и закрытие по нажатию вне меню.
   *
   * ⚠️ Складывать блок отсюда нельзя: до 10.10.2026 он приходил открытым
   * и складывался этим скриптом после отрисовки — сдвиг вёрстки 0.18
   * на узком экране (задача 44). Ловит сценарий «вёрстка не сдвигается».
   *
   * Признак «узкий экран» берётся из фактической видимости заголовка,
   * а не из ширины окна: точка перелома задана в стилях, и дублировать
   * её числом здесь значит завести второе место, где она записана.
   * В браузере без ::details-content заголовок на широком экране виден,
   * пока блок закрыт, — там меню остаётся раскрываемым нажатием. */
  var outer = document.querySelector('[data-menu]');

  function syncOuter() {
    if (!outer) return;
    var summary = outer.querySelector(':scope > summary');
    if (!summary) return;
    var narrow = summary.offsetParent !== null;
    // На широком экране блок обязан оставаться открытым всегда
    if (!narrow) outer.open = true;
  }

  syncOuter();

  // Поворот экрана и изменение окна меняют, какой режим действует
  window.addEventListener('resize', syncOuter);

  function closeAll(except) {
    for (var i = 0; i < menus.length; i++) {
      var m = menus[i];
      if (m === except || m.contains(except)) continue;
      // Внешнее меню на широком экране раскрыто постоянно через
      // display: contents — закрывать его там нельзя, иначе навигация
      // исчезнет. Признак: заголовок скрыт стилями
      var summary = m.querySelector(':scope > summary');
      if (summary && summary.offsetParent === null) continue;
      m.open = false;
    }
  }

  document.addEventListener('click', function (e) {
    var inside = e.target.closest('[data-menu], [data-sub]');
    closeAll(inside);
  });

  /* Фокус ушёл из меню — меню закрывается, как при нажатии вне его.
   * Без этого раскрытый список оставался поверх страницы, пока Tab шёл
   * дальше, и закрывал собой следующие остановки (аудит 10.10, Д1,
   * 2.4.11): на 1280 × 900 — 12 из 57, на 390 — «Главная» и «Услуги»
   * крошек целиком.
   *
   * Слушается focusin на документе, а не focusout у меню: получатель
   * фокуса здесь — сам элемент, и решение то же, что у нажатия выше.
   * У focusout получатель — relatedTarget, а он пуст и при уходе фокуса
   * из окна, и при нажатии на заголовок в Safari, который заголовку фокус
   * не даёт. Фокус ушёл из окна — меню остаётся как было.
   *
   * Из «Услуг» в «Каталог» на узком экране «Услуги» тоже складываются:
   * фокус вне вложенного блока, а внешний меню остаётся открытым */
  document.addEventListener('focusin', function (e) {
    closeAll(e.target.closest('[data-menu], [data-sub]'));
  });

  /* Escape закрывает один уровень — самый внутренний открытый блок
   * с видимым заголовком — и возвращает фокус на этот заголовок.
   *
   * ⚠️ До 06.10.2026 бралось первое открытое по порядку разметки. Это
   * внешнее меню, а на широком экране его заголовок скрыт: «Услуги»
   * закрывались, а фокус оставался на ссылке внутри закрытой панели,
   * то есть на невидимом элементе. На узком экране закрывалось всё меню
   * сразу. Порядок разметки ставит вложенный блок после внешнего,
   * поэтому обход идёт с конца. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelectorAll('[data-sub][open], [data-menu][open]');
    for (var i = open.length - 1; i >= 0; i--) {
      var summary = open[i].querySelector(':scope > summary');
      if (!summary || summary.offsetParent === null) continue;
      // Вложенный блок внутри закрытого внешнего не виден, хотя open
      if (open[i].parentElement.closest('details:not([open])')) continue;
      open[i].open = false;
      summary.focus();
      return;
    }
  });
})();

/* Шапка на телефоне прячется при чтении (задача 94, Марат 13.10).
 * Здесь, а не отдельным файлом: седьмому скрипту нет места в бюджете.
 *
 *   — листаешь вниз на 40 px и больше, дальше высоты шапки — уезжает;
 *   — потянул вверх больше чем на 40 px подряд — возвращается;
 *   — у верха страницы, в первые 100 px, видна всегда;
 *   — движение короче 40 px в одну сторону её не трогает.
 *
 * Видна всегда, пока в шапке фокус с клавиатуры, открыто меню или
 * включено сниженное движение. Последнее — ставка задачи: уезжающая
 * и выезжающая полоса — то самое движение, от которого человек
 * отказался; вернуть «прячется, но без перехода» — убрать calm из pinned.
 *
 * Скрипт только ставит шапке признак data-hidden. Что он значит, решают
 * стили, и только до точки lg: на компьютере шапка не двигается, точка
 * перелома здесь числом не повторяется. Там же отступ прокрутки
 * под шапку — от признака (base.css). На компьютере признак и не ставится:
 * внешнее меню там раскрыто всегда (syncOuter выше), а раскрытое меню
 * держит шапку.
 *
 * ⚠️ Прокрутку, которую сделал браузер, а не человек, не считать.
 * Фокус с клавиатуры и переход по якорю докручивают страницу сами,
 * и без этого обратный Tab вверх на 40 px выдвигал бы шапку прямо
 * на только что докрученный элемент: отступ прокрутки ставился ещё
 * для спрятанной (Mp10, 2.4.11). Поэтому после фокуса и нажатия
 * на якорь два кадра прокрутка только запоминается: событие scroll
 * приходит в ближайшем кадре, до вызовов requestAnimationFrame. */
(function () {
  'use strict';

  var header = document.querySelector('[data-site-header]');
  if (!header) return;
  var menu = header.querySelector('[data-menu]');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  var TOP = 100;
  var STEP = 40;

  // Пружина у краёв в Safari уводит прокрутку за 0 и за низ страницы —
  // это не движение человека, и шапку она дёргать не должна
  function pos() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.min(Math.max(window.scrollY, 0), Math.max(max, 0));
  }

  var last = pos();   // где была страница в прошлом событии
  var from = last;    // откуда началось движение в эту сторону
  var down = true;
  var held = false;
  var seq = 0;

  function pinned() {
    return calm.matches || (menu && menu.open) || !!header.querySelector(':focus-visible');
  }

  function show() { header.removeAttribute('data-hidden'); }
  function hide() { if (!pinned()) header.setAttribute('data-hidden', ''); }

  function rebase() { last = from = pos(); }

  /* Браузер докрутил к фокусу у верха страницы, а шапка спрятана: у верха
   * она видна всегда. Выезжая, она легла бы на элемент, который браузер
   * поставил под самый край — отступ прокрутки был для спрятанной. Тогда
   * элемент докручивается ещё раз, уже с отступом под шапку */
  function settle() {
    rebase();
    if (last > TOP || !header.hasAttribute('data-hidden')) return;
    show();
    var el = document.activeElement;
    if (el && el !== document.body && !header.contains(el)
      && el.getBoundingClientRect().top < header.offsetHeight) el.scrollIntoView({ block: 'nearest' });
  }

  function hold() {
    var mine = ++seq;
    held = true;
    rebase();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (mine !== seq) return;
        held = false;
        settle();
      });
    });
  }

  window.addEventListener('scroll', function () {
    var y = pos();
    if (held || y <= TOP) {
      if (!held) show();
      last = from = y;
      return;
    }
    if (y === last) return;
    if ((y > last) !== down) {
      down = y > last;
      from = last;
    }
    last = y;
    if (down && y - from >= STEP && y > header.offsetHeight) hide();
    else if (!down && from - y > STEP) show();
  }, { passive: true });

  document.addEventListener('focusin', function (e) {
    if (header.contains(e.target)) show();
    hold();
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (a && a.pathname === location.pathname && a.hash) hold();
  });

  if (menu) menu.addEventListener('toggle', function () { if (menu.open) show(); });
  calm.addEventListener('change', function () { if (calm.matches) show(); });
})();

/* Ссылки, уводящие со страницы услуги, — в новой вкладке на компьютере
 * (задача 71). Не меню, но навигация: отдельным файлом не вынесено ради
 * бюджета скриптов — на странице услуги их 5 из 6 (budget.json), шестой
 * займёт Turnstile.
 *
 * Зачем: человек, ушедший со страницы услуги к смежной услуге или
 * в каталог, не должен терять страницу с формой — решение Марата 11.10.
 *
 * Какие ссылки — только на двух шаблонах:
 *   страница услуги — карточки внутри <main> на другие услуги, в каталог
 *     и на объекты: «Смежные услуги», блок объектов (задача 80). Ссылки
 *     из текста и «Все объекты» — в той же вкладке, без значка: на
 *     монтаже значков было 18, в одном предложении четыре (проверяющий
 *     задачи 79, находки 7, 8; Марат 15.10 — только у карточек, задача
 *     103). Не трогаются кнопки действий (.button), раздел /uslugi/
 *     и сама страница; меню, крошки, подвал и панель стоят вне <main>;
 *   карточка каталога — ссылка «связанная услуга» (data-goal).
 *
 * Когда — только на компьютере: точный указатель и окно от 62rem. На
 * телефоне вкладки неудобны, там та же вкладка, а введённое в форму
 * хранит черновик в form.js. Без скрипта — обычные ссылки в той же
 * вкладке, это рабочее состояние.
 *
 * Значок и подпись для программы чтения ставит скрипт, а не разметка:
 * без новой вкладки обещание «откроется в новой вкладке» было бы ложью.
 * Значок — рисунком: стрелки ↗ в шрифтах нет, и проверка шрифтов не
 * пропустит её в тексте. rel="noopener" — старые браузеры дают открытой
 * вкладке доступ к этой через window.opener. */
(function () {
  'use strict';

  var desktop = window.matchMedia('(pointer: fine) and (min-width: 62rem)');
  var type = document.body.getAttribute('data-page-type');
  var links = [];

  if (type === 'service') {
    links = Array.prototype.filter.call(
      document.querySelectorAll('main a[href^="/uslugi/"], main a[href^="/katalog/"], main a[href^="/proekty/"]'),
      function (a) {
        var path = new URL(a.href, location.href).pathname;
        return a.classList.contains('card-link') && !a.classList.contains('button')
          && path !== '/uslugi/' && path !== location.pathname;
      });
  } else if (type === 'catalog-item') {
    links = Array.prototype.slice.call(document.querySelectorAll('main a[data-goal="related-service"]'));
  }
  if (!links.length) return;

  var SVG = 'http://www.w3.org/2000/svg';

  function icon() {
    var svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'new-tab-icon');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', 'M3 9 9 3M4.5 3H9v4.5');
    svg.appendChild(path);
    return svg;
  }

  function note() {
    var span = document.createElement('span');
    span.className = 'new-tab-note';
    span.textContent = ' (откроется в новой вкладке)';
    return span;
  }

  /* Окно меняет ширину, к планшету подключают мышь — состояние следует
   * за условием, а не замирает на загрузке */
  /* Значок — вместе с последним словом в неразрывной обёртке. Без неё
   * перенос перед рисунком разрешён: в карточке «Проектирование систем
   * пожарной безопасности» ↗ стоял на строке один. Соединитель слов
   * U+2060 перед рисунком Chromium не удержал (снимок задачи 71) */
  function addTail(a) {
    var walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    var last = null;
    var node;
    while ((node = walker.nextNode())) if (node.nodeValue.trim()) last = node;
    var tail = document.createElement('span');
    tail.className = 'new-tab-tail';
    if (last) {
      var text = last.nodeValue.replace(/\s+$/, '');
      var cut = text.search(/\S+$/);
      last.nodeValue = text.slice(0, cut);
      tail.textContent = text.slice(cut);
      last.parentNode.insertBefore(tail, last.nextSibling);
    } else {
      a.appendChild(tail);
    }
    tail.appendChild(icon());
  }

  function removeTail(a) {
    a.querySelectorAll('.new-tab-tail').forEach(function (t) { t.replaceWith(t.textContent); });
    a.normalize();
  }

  function apply(on) {
    links.forEach(function (a) {
      a.querySelectorAll('.new-tab-note').forEach(function (n) { n.remove(); });
      removeTail(a);
      if (on) {
        a.target = '_blank';
        a.rel = 'noopener';
        addTail(a);
        a.appendChild(note());
      } else {
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
    });
  }

  apply(desktop.matches);
  desktop.addEventListener('change', function (e) { apply(e.matches); });
})();

/* Появление блоков при прокрутке (задача 72, Mt4). Тоже не меню, и тоже
 * здесь ради бюджета: своих скриптов на странице до 5, с Turnstile — 6
 * из 6 (budget.json), отдельному файлу места нет.
 *
 * Что проявляется: дети блоков <main> после первого экрана — заголовок,
 * абзац, список карточек, поля формы — каждый, когда доходит до окна.
 * Блок, где среди детей карточки, проявляется целиком: у карточки свои
 * сдвиг и переход, их не смешивать.
 *
 * Что уже в окне или выше при загрузке — видно сразу, без перехода:
 * прятать то, на что человек уже смотрит, значит мигнуть. Метку
 * data-reveal получает и оно — по ней проверки считают блоки; класс
 * is-visible — значит «показан». Стили — в base.css.
 *
 * Без скрипта и при сниженном движении меток нет — всё видно сразу.
 * Фокус, ушедший в непоказанный блок (Tab, переход по якорю), показывает
 * его сразу: у прозрачного поля фокус не виден.
 *
 * Появление не отстаёт от прокрутки (задача 139: «ты уже проскроллил, а оно
 * только начало отрисовывать»). Блок начинает проявляться за EARLY окна до
 * входа (снизу и сверху), а не после. Прокрутка быстрее FAST окна за
 * 100 мс — блок показывается сразу, без перехода (класс is-instant).
 * Возврат назад или вперёд, обновление и переход по якорю — показано всё:
 * человек туда уже смотрел или прыгает мимо. Замер —
 * tools/пустое-окно-139.mjs.
 *
 * Где есть animation-timeline: view(), появление ведёт сама прокрутка
 * (задача 154, base.css): наблюдатель и отслеживание скорости не нужны,
 * скрипт только ставит метки и is-visible — в окне при загрузке, фокус,
 * якорь, возврат. Путь выше — запасной для браузеров без view(). */
(function () {
  'use strict';

  var main = document.querySelector('main');
  var byScroll = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!main || !(byScroll || 'IntersectionObserver' in window)) return;
  if (!window.matchMedia('screen and (prefers-reduced-motion: no-preference)').matches) return;

  var EARLY = 0.5;
  var FAST = 0.3;

  function skip(el) {
    return el.matches('script, style, template, [hidden], .visually-hidden');
  }

  var targets = [];
  Array.prototype.forEach.call(main.children, function (block) {
    if (skip(block) || block.classList.contains('hero')) return;
    var kids = Array.prototype.filter.call(block.children, function (k) { return !skip(k); });
    var whole = !kids.length || kids.some(function (k) { return k.matches('.card, .tile'); });
    if (whole) targets.push(block);
    else targets.push.apply(targets, kids);
  });

  // is-instant снимается через кадр: переход отключён только на показ
  function show(el, instant) {
    el.classList.add('is-visible');
    if (observer) observer.unobserve(el);
    if (!instant || byScroll) return;
    el.classList.add('is-instant');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.remove('is-instant'); });
    });
  }

  function showAll() {
    targets.forEach(function (el) { show(el, true); });
  }

  // Скорость — по последним 100 мс прокрутки. Первая запись всегда старше
  // окна: рывок после покоя (End, якорь) меряется от места, где стояли
  var track = [{ t: performance.now(), y: window.scrollY }];
  if (!byScroll) window.addEventListener('scroll', function () {
    var now = performance.now();
    track.push({ t: now, y: window.scrollY });
    while (track.length > 2 && track[1].t < now - 100) track.shift();
  }, { passive: true });

  // Последняя запись старше 100 мс — прокрутка стоит, и наблюдатель
  // сработал от перестройки вёрстки, а не от рывка
  function fast() {
    var last = track[track.length - 1];
    if (performance.now() - last.t > 100) return false;
    return Math.abs(last.y - track[0].y) > FAST * window.innerHeight;
  }

  var observer = byScroll ? null : new IntersectionObserver(function (entries) {
    var instant = fast();
    entries.forEach(function (e) { if (e.isIntersecting) show(e.target, instant); });
  }, { rootMargin: EARLY * 100 + '% 0px' });

  var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  // Возврат и обновление: браузер ставит страницу туда, где стояли
  var all = location.hash || (nav && (nav.type === 'back_forward' || nav.type === 'reload'));
  var fold = window.innerHeight;
  targets.forEach(function (el) {
    el.setAttribute('data-reveal', '');
    if (all) show(el, true);
    else if (el.getBoundingClientRect().top < fold) el.classList.add('is-visible');
    else if (observer) observer.observe(el);
  });

  window.addEventListener('pageshow', function (e) { if (e.persisted) showAll(); });
  window.addEventListener('hashchange', showAll);
  document.addEventListener('click', function (e) {
    var a = !e.defaultPrevented && e.target.closest && e.target.closest('a[href*="#"]');
    if (a && a.hash && a.origin === location.origin && a.pathname === location.pathname) showAll();
  });

  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-reveal]:not(.is-visible)');
    if (el) show(el);
  });
})();

/* Окно просмотра: сканы документов и снимки объектов (задача 102). Тоже
 * здесь ради бюджета скриптов — на странице услуги их 5 из 6.
 *
 * Что открывает — ссылку с data-viewer: превью скана (DocScans) и кадр
 * галереи объекта. Без скрипта это обычная ссылка на файл полного
 * размера — рабочее состояние, как до задачи. Ctrl и средняя кнопка —
 * тоже как у ссылки: файл в новой вкладке.
 *
 * Окно — нативный <dialog> (Cv25): Esc, удержание фокуса и верхний слой
 * даёт браузер. Создаёт окно скрипт: без скрипта оно не нужно, и в
 * разметке страниц его нет. Закрывают крестик, Esc и клик мимо картинки,
 * подписи и кнопок — диалог на всё окно браузера, и «мимо» — это фон.
 *
 * Фокус после закрытия — на ссылке показанного кадра. Открыл первый,
 * закрыл — снова на первом; пролистал до пятого — на пятом: страница
 * под окном стоит там, где человек остановился, а не прыгает назад.
 *
 * Галерея — ссылки внутри data-viewer-group: стрелки на экране и
 * клавишами ← →, счётчик «3 из 8», по кругу. Одиночный скан стрелок
 * и счётчика не показывает.
 *
 * Размеры картинке — от превью (атрибуты width и height): место занято
 * до загрузки, окно не меняет размер, когда файл догрузился. Подпись —
 * копия подписи превью, с пометкой «Иллюстрация» и ссылкой на файл.
 * Стили — src/styles/blocks/viewer.css (задача 111). Значки — Lucide, как
 * в icons.ts: close, chevron-right и chevron-left того же набора. */
(function () {
  'use strict';

  if (!document.querySelector('a[data-viewer]') || typeof HTMLDialogElement !== 'function') return;

  function icon(paths) {
    return '<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none"'
      + ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'
      + ' aria-hidden="true" focusable="false">' + paths + '</svg>';
  }

  /* tone-federal — тёмная тональность бренда: цвета текста, ссылок
   * и фокуса в ней уже подобраны под контраст на тёмном (tokens.css) */
  var dialog = document.createElement('dialog');
  dialog.className = 'viewer tone-federal';
  dialog.setAttribute('aria-label', 'Просмотр изображения');
  dialog.innerHTML =
    '<button type="button" class="viewer-close" data-viewer-close aria-label="Закрыть">'
      + icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>') + '</button>'
    + '<figure class="viewer-figure"><img class="viewer-image" alt="" decoding="async"><figcaption></figcaption></figure>'
    + '<div class="viewer-nav" data-viewer-nav>'
      + '<button type="button" data-viewer-prev aria-label="Предыдущий кадр">'
        + icon('<path d="m15 18-6-6 6-6"/>') + '</button>'
      + '<p class="viewer-count" data-viewer-count aria-live="polite"></p>'
      + '<button type="button" data-viewer-next aria-label="Следующий кадр">'
        + icon('<path d="m9 18 6-6-6-6"/>') + '</button>'
    + '</div>';
  document.body.appendChild(dialog);

  var img = dialog.querySelector('img');
  var caption = dialog.querySelector('figcaption');
  var nav = dialog.querySelector('[data-viewer-nav]');
  var count = dialog.querySelector('[data-viewer-count]');
  var group = [];
  var index = 0;

  function show(i) {
    index = (i + group.length) % group.length;
    var a = group[index];
    var thumb = a.querySelector('img');
    var source = a.closest('figure') && a.closest('figure').querySelector('figcaption');

    /* Сначала снять прежний src: иначе до загрузки нового файла прежний
     * кадр стоит в новых пропорциях и под чужой подписью */
    img.removeAttribute('src');
    /* Размеры — от крупного файла, если ссылка их называет (data-full-w,
     * -h: превью каталога меньше файла), иначе от превью */
    var w = a.getAttribute('data-full-w') || (thumb && thumb.getAttribute('width'));
    var h = a.getAttribute('data-full-h') || (thumb && thumb.getAttribute('height'));
    if (w && h) {
      img.setAttribute('width', w);
      img.setAttribute('height', h);
      img.style.setProperty('--w', w);
      img.style.setProperty('--h', h);
    }
    img.alt = thumb ? thumb.alt : '';
    img.src = a.getAttribute('href');

    caption.textContent = '';
    if (source) {
      Array.prototype.forEach.call(source.childNodes, function (n) { caption.appendChild(n.cloneNode(true)); });
    }
    caption.hidden = !source;
    count.textContent = (index + 1) + ' из ' + group.length;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[data-viewer]');
    if (!a) return;
    e.preventDefault();
    var box = a.closest('[data-viewer-group]');
    group = box ? Array.prototype.slice.call(box.querySelectorAll('a[data-viewer]')) : [a];
    nav.hidden = group.length < 2;
    show(group.indexOf(a));
    dialog.showModal();
  });

  dialog.querySelector('[data-viewer-close]').addEventListener('click', function () { dialog.close(); });
  dialog.querySelector('[data-viewer-prev]').addEventListener('click', function () { show(index - 1); });
  dialog.querySelector('[data-viewer-next]').addEventListener('click', function () { show(index + 1); });

  dialog.addEventListener('click', function (e) {
    if (!e.target.closest('img, button, figcaption, [data-viewer-count]')) dialog.close();
  });

  /* Свайп на телефоне: горизонтальный жест пальцем листает галерею, как
   * стрелки. Вертикальный и короткий не считаются */
  var touchX = null;
  var touchY = null;
  dialog.addEventListener('touchstart', function (e) {
    if (nav.hidden || e.touches.length !== 1) { touchX = null; return; }
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  dialog.addEventListener('touchend', function (e) {
    if (touchX === null || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    touchX = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    show(index + (dx < 0 ? 1 : -1));
  });

  dialog.addEventListener('keydown', function (e) {
    if (nav.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });

  dialog.addEventListener('close', function () {
    if (group[index]) group[index].focus();
  });
})();

/* Поиск по каталогу (задача 183а) — здесь только пуск. Сам поиск
 * (search.js), его индекс и стили на страницу не подключены: их открывает
 * не каждый, а грузил бы каждый (W19). Файл подтягивается по первому
 * фокусу в поле поиска или по нажатию на лупу в шапке.
 *
 * Без скрипта лупа — обычная ссылка на каталог, к полю поиска. Если
 * search.js не загрузился, нажатие ведёт туда же */
(function () {
  'use strict';

  var loading = null;
  function load() {
    if (!loading) {
      loading = new Promise(function (ok, fail) {
        var s = document.createElement('script');
        s.src = '/scripts/search.js';
        s.onload = ok;
        s.onerror = fail;
        document.head.appendChild(s);
      });
      loading.catch(function () { loading = null; });
    }
    return loading;
  }

  document.addEventListener('focusin', function (e) {
    if (e.target.matches && e.target.matches('[data-search-input]')) load().catch(function () {});
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('[data-search-open]');
    if (!a) return;
    e.preventDefault();
    load().then(
      function () { window.alfaSearch.open(a); },
      function () { location.assign(a.href); }
    );
  });

  /* Пришли по «Оставить заявку» из окна поиска на другой странице:
   * запрос лежит в хранилище вкладки, search.js положит его в поле
   * и в заявку — сразу, без фокуса. Хранилище недоступно — пропускаем */
  try {
    if (sessionStorage.getItem('alfa-search-query') && document.querySelector('main [data-search-input]')) {
      load().catch(function () {});
    }
  } catch { /* без хранилища заявка уйдёт без запроса */ }
})();
