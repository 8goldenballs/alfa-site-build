// Клиентская валидация формы.
//
// Зачем: форма отправляется обычным способом, и при серверном отказе
// введённое теряется — возврата на заполненную форму на статике нет.
// Значит все восстановимые ошибки обязаны отсекаться здесь (Cv19).
//
// Чего скрипт НЕ делает: не отправляет форму сам. Проверил — отдал
// браузеру. Иначе цель начнёт фиксировать намерение, а не результат (Cv9).

const MESSAGES = {
  valueMissing: {
    text: 'Заполните поле',
    checkbox: 'Без согласия мы не можем принять заявку',
  },
  tooShort: 'Слишком коротко — опишите задачу хотя бы одним предложением',
  typeMismatch: 'Проверьте формат',
  patternMismatch: 'Проверьте формат',
  email: 'Проверьте адрес почты: нужен вид name@mail.ru',
};

// Короче минимума — считаем отдельно, а не через validity.tooShort.
//
// Причина: tooShort выставляется только если значение правил человек.
// Предзаполненное из параметров адреса (Cv18) короткое значение
// встроенная проверка пропустит, сервер отклонит с 422 — и введённое
// пропадёт, потому что возврата на заполненную форму нет.
function tooShort(field) {
  const min = Number(field.getAttribute('minlength') || 0);
  return min > 0 && field.value.length > 0 && field.value.length < min;
}

function isValid(field) {
  return field.checkValidity() && !tooShort(field);
}

function messageFor(field) {
  const v = field.validity;
  // Своя проверка поля связи (задача 93): текст ставит она сама
  if (v.customError) return field.validationMessage;
  // Пустое поле связи — с форматом способа: пример в поле при вводе
  // пропадает, а слова «Заполните поле» мало (задача 164а)
  if (v.valueMissing && field.dataset.contactEmpty) return field.dataset.contactEmpty;
  if (v.valueMissing) {
    return field.type === 'checkbox'
      ? MESSAGES.valueMissing.checkbox
      : MESSAGES.valueMissing.text;
  }
  if (v.tooShort || tooShort(field)) return MESSAGES.tooShort;
  if (field.type === 'email' && (v.typeMismatch || v.patternMismatch)) return MESSAGES.email;
  if (v.typeMismatch) return MESSAGES.typeMismatch;
  if (v.patternMismatch) return MESSAGES.patternMismatch;
  return 'Проверьте значение';
}

// Ошибка — тот из описаний поля, что с классом field-error: у поля
// связи и почты в описании ещё и подсказка (задача 93)
function errorBox(field) {
  const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  return ids.map((id) => document.getElementById(id))
    .find((el) => el && el.classList.contains('field-error')) || null;
}

function showError(field, text) {
  const box = errorBox(field);
  if (!box) return;
  box.textContent = text;          // не innerHTML: вставка разметки здесь не нужна
  box.hidden = false;
  field.setAttribute('aria-invalid', 'true');
}

function clearError(field) {
  const box = errorBox(field);
  if (box) { box.textContent = ''; box.hidden = true; }
  field.removeAttribute('aria-invalid');
}

// ── Черновик на время вкладки (задача 71) ──
//
// На телефоне ссылки на смежные услуги и в каталог открываются в той же
// вкладке. Начал заявку, ушёл посмотреть оборудование, вернулся «Назад» —
// страница загрузилась заново, поля пустые: браузер возвращает введённое
// сам, только если страница пришла из кэша переходов. Черновик — в
// sessionStorage: живёт, пока открыта вкладка, на сервер не уходит.
//
// Не хранятся согласия и служебные поля. Галочку согласия человек ставит
// при каждой отправке сам — сохранённая уже не его действие (L4).
// Ловушку, метку времени, тип формы и токен проверки ставит страница.
//
// Восстанавливается только в пустое поле: то, что вернул браузер или
// подставил адрес (Cv18), не перезаписывается. Событие input при этом
// не посылается — иначе goals.js засчитал бы старт заполнения без ввода.
// Очищается, когда проверка пропустила отправку.
//
// ⚠️ Отступление от образца quality/FORM.md: в образце черновика нет.
// Отдельным файлом не вынесено ради бюджета скриптов (budget.json)

const NOT_DRAFTED = ['hidden', 'checkbox', 'radio', 'submit', 'button', 'reset', 'file', 'password', 'image'];

function draftStorage() {
  try {
    window.sessionStorage.getItem('alfa-draft');
    return window.sessionStorage;
  } catch {
    return null;                    // хранилище закрыто настройками — форма работает как раньше
  }
}

function draftFields(form) {
  return [...form.elements].filter((el) => el.name
    && !el.closest('.honeypot')
    && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
      || (el.tagName === 'INPUT' && !NOT_DRAFTED.includes(el.type))));
}

// Адрес, номер формы на странице и тип: на странице бывают две формы
function draftKey(form) {
  const index = [...document.querySelectorAll('form[data-form]')].indexOf(form);
  return `alfa-draft:${location.pathname}:${index}:${form.dataset.form}`;
}

function initDraft(form, storage) {
  let draft = null;
  try {
    draft = JSON.parse(storage.getItem(draftKey(form)) || 'null');
  } catch {
    draft = null;
  }
  if (draft) {
    for (const field of draftFields(form)) {
      if (!field.value && typeof draft[field.name] === 'string') field.value = draft[field.name];
    }
    // Выбранный способ связи: без него «@ivan» вернулся бы в режим
    // «Телефон» и не прошёл проверку (задача 93)
    for (const radio of form.querySelectorAll('input[type="radio"]')) {
      if (draft[radio.name] === radio.value) radio.checked = true;
    }
  }

  form.addEventListener('input', () => {
    const values = {};
    for (const field of draftFields(form)) {
      if (field.value.trim()) values[field.name] = field.value;
    }
    for (const radio of form.querySelectorAll('input[type="radio"]:checked')) {
      if (!radio.defaultChecked) values[radio.name] = radio.value;
    }
    try {
      if (Object.keys(values).length) storage.setItem(draftKey(form), JSON.stringify(values));
      else storage.removeItem(draftKey(form));
    } catch {
      // хранилище переполнено — черновик не обязателен
    }
  });
}

// ── Способ связи (задача 93) ──
//
// Переключатель «Телефон · Telegram · Max» над полем связи
// (ContactField.astro). Без скрипта группа скрыта и поле — телефонное.
// Скрипт показывает группу и по выбору меняет подпись, пример в поле,
// inputmode, autocomplete, длину и проверку поля. Имя поля одно — phone,
// способ уходит в contact_method; сервер проверяет те же правила.
//
// Правила идентификаторов и источники — отчёт 2026-10-15-сессия-4:
// - Telegram: имя 5–32 знака, a–z, 0–9 и «_» (core.telegram.org,
//   account.updateUsername; telegram.org/faq), первая — буква; ссылки
//   t.me/имя и имя.t.me;
// - Max: личного ника у людей нет — номер или ссылка на профиль
//   max.ru/u/… из приложения.
// WhatsApp убран (задача 164а): поэтапная блокировка в РФ с ноября 2025.
//
// Пример внутри поля пропадает при вводе — формат каждого способа
// повторён в его сообщении об ошибке (задача 164а). Пример короткий:
// в паре на широком поле 191–213 px, длинный обрезался
//
// ⚠️ Имена верхнего уровня — с приставкой «связь»: обычные скрипты
// делят одну глобальную область (см. goals.js)

const связьЦифры = (v) => v.replace(/\D/g, '');
const связьНомерЗнаки = /^\+?[\d\s().-]+$/;

// Российский номер: 11 цифр с 7 или 8 впереди либо 10 цифр без кода.
// Возвращает 11 цифр с 7 впереди или null
function связьРоссийский(v) {
  const s = v.trim();
  if (!связьНомерЗнаки.test(s)) return null;
  const d = связьЦифры(s);
  if (d.length === 11 && (d[0] === '7' || (d[0] === '8' && !s.startsWith('+')))) return `7${d.slice(1)}`;
  if (d.length === 10 && !s.startsWith('+')) return `7${d}`;
  return null;
}

// Номер любой страны: от 10 до 15 цифр (E.164 — не длиннее 15)
const связьЛюбойНомер = (v) => связьРоссийский(v) !== null
  || (связьНомерЗнаки.test(v.trim()) && /^\d{10,15}$/.test(связьЦифры(v)));

const связьНикTelegram = /^[a-z][a-z0-9_]{4,31}$/i;

function связьTelegram(v) {
  const s = v.trim();
  const ссылка = s.match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/@?([^/?#\s]+)\/?$/i)
    || s.match(/^(?:https?:\/\/)?([^./\s]+)\.t\.me\/?$/i);
  return связьНикTelegram.test(ссылка ? ссылка[1] : s.replace(/^@/, ''));
}

const связьMax = (v) => связьЛюбойНомер(v)
  || /^(?:https?:\/\/)?(?:www\.)?max\.ru\/[\w-]+(?:\/[\w-]+)*\/?$/i.test(v.trim());

const СПОСОБЫ_СВЯЗИ = {
  phone: {
    подпись: 'Телефон',
    пример: '+7 999 123-45-67',
    type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: 20,
    верно: (v) => связьРоссийский(v) !== null,
    ошибка: 'Нужен российский номер: +7 и 10 цифр, например +7 999 123-45-67',
    пусто: 'Укажите номер: +7 и 10 цифр, например +7 999 123-45-67',
  },
  telegram: {
    подпись: 'Ник или ссылка в Telegram',
    пример: '@ivan_petrov',
    type: 'text', inputmode: 'text', autocomplete: 'off', maxlength: 100,
    верно: связьTelegram,
    ошибка: 'Нужен ник Telegram: 5–32 латинские буквы, цифры или _, первая — буква. Или ссылка t.me/ник',
    пусто: 'Укажите ник Telegram, например @ivan_petrov, или ссылку t.me/ник',
  },
  max: {
    подпись: 'Номер или ссылка в Max',
    пример: 'Номер или max.ru/u/…',
    type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: 100,
    верно: связьMax,
    ошибка: 'Нужен номер телефона, например +7 999 123-45-67, или ссылка на профиль вида max.ru/u/…',
    пусто: 'Укажите номер телефона, например +7 999 123-45-67, или ссылку на профиль max.ru/u/…',
  },
};

// Буква или @ в режиме «Телефон» — похоже на ник
const связьПохожеНаНик = /[a-zа-яё@]/i;

function initContact(form) {
  const группа = form.querySelector('[data-contact-method]');
  const поле = form.querySelector('[data-contact-field]');
  if (!группа || !поле) return;
  const подпись = form.querySelector(`label[for="${поле.id}"]`);
  const предложение = form.querySelector('[data-contact-suggest]');
  const шаблон = form.querySelector('template[data-contact-suggest-template]');
  const выбрано = form.querySelector('[data-contact-chosen]');
  const выбор = () => {
    const отмечен = группа.querySelector('input:checked');
    return отмечен && СПОСОБЫ_СВЯЗИ[отмечен.value] ? отмечен.value : 'phone';
  };

  const проверить = () => {
    const способ = СПОСОБЫ_СВЯЗИ[выбор()];
    const v = поле.value.trim();
    поле.setCustomValidity(v && !способ.верно(v) ? способ.ошибка : '');
  };

  const предложить = () => {
    if (!предложение) return;
    if (выбор() !== 'phone' || !связьПохожеНаНик.test(поле.value)) {
      предложение.replaceChildren();
      return;
    }
    if (предложение.childElementCount || !шаблон) return;    // уже показано — не переозвучивать
    предложение.replaceChildren(шаблон.content.cloneNode(true));
  };

  const применить = () => {
    const способ = СПОСОБЫ_СВЯЗИ[выбор()];
    if (подпись) подпись.textContent = способ.подпись;
    // Подпись выбранного под значками (задача 99) — слово самой кнопки
    const слово = группа.querySelector('input:checked')?.closest('label')?.querySelector('.contact-word');
    if (выбрано && слово) выбрано.textContent = слово.textContent;
    поле.placeholder = способ.пример;
    поле.dataset.contactEmpty = способ.пусто;
    поле.type = способ.type;
    поле.inputMode = способ.inputmode;
    поле.autocomplete = способ.autocomplete;
    поле.maxLength = способ.maxlength;
    проверить();
    предложить();
    // Ошибка уже на экране — пересчитать под новый способ
    const box = errorBox(поле);
    if (box && !box.hidden) {
      if (isValid(поле)) clearError(поле);
      else showError(поле, messageFor(поле));
    }
  };

  группа.hidden = false;
  поле.autocapitalize = 'none';
  поле.spellcheck = false;
  применить();

  группа.addEventListener('change', применить);
  поле.addEventListener('input', () => { проверить(); предложить(); });

  // Маска +7: по уходу из поля верный российский номер приводится к виду
  // «+7 999 123-45-67». Не по каждому нажатию — маска на вводе спорит
  // с курсором, вставкой и автозаполнением
  поле.addEventListener('blur', () => {
    if (выбор() !== 'phone') return;
    const d = связьРоссийский(поле.value);
    if (d) поле.value = `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  });

  // Режим переключает только человек — кнопкой в подсказке
  предложение?.addEventListener('click', (e) => {
    const кнопка = e.target instanceof Element ? e.target.closest('[data-contact-switch]') : null;
    if (!кнопка) return;
    const radio = группа.querySelector(`input[value="${кнопка.dataset.contactSwitch}"]`);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    radio.dispatchEvent(new Event('input', { bubbles: true }));   // черновик запомнит выбор
    поле.focus();
  });
}

function initForm(form) {
  const status = form.querySelector('[role="status"]');
  const submitBtn = form.querySelector('[type="submit"]');
  const storage = draftStorage();
  // Возврат «назад» достаёт страницу из кеша вместе с отключённой кнопкой
  // и текстом «Отправляем…» — без этого форма остаётся мёртвой (Mp7)
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    if (submitBtn) submitBtn.disabled = false;
    if (status) status.textContent = '';
  });
  if (storage) initDraft(form, storage);
  // После черновика: режим поля связи берётся из восстановленного выбора.
  // До общего обработчика ввода: тот снимает ошибку, только если своя
  // проверка поля уже пересчитана
  initContact(form);

  // Метка времени открытия. На сборке она стала бы константой,
  // поэтому ставится в браузере (Sec4).
  // Секунды, не миллисекунды: обработчик сравнивает с time().
  const ts = form.querySelector('input[name="form_ts"]');
  if (ts) ts.value = String(Math.floor(Date.now() / 1000));

  // Ошибка снимается по мере исправления, а не только при отправке
  form.addEventListener('input', (e) => {
    const field = e.target;
    if (field.willValidate && isValid(field)) clearError(field);
  });

  form.addEventListener('submit', (e) => {
    const fields = [...form.elements].filter(
      (el) => el.willValidate && el.type !== 'hidden'
    );

    let firstInvalid = null;
    for (const field of fields) {
      if (isValid(field)) {
        clearError(field);
      } else {
        showError(field, messageFor(field));
        if (!firstInvalid) firstInvalid = field;
      }
    }

    if (!firstInvalid) {
      if (status) status.textContent = 'Отправляем…';
      if (submitBtn) submitBtn.disabled = true;   // двойной щелчок не даст вторую заявку (Mp7)
      if (storage) storage.removeItem(draftKey(form));
      return;                       // отдаём браузеру, форма уходит как обычно
    }

    e.preventDefault();

    // Сводка в область объявлений: программа чтения с экрана
    // сообщит о проблеме, даже если фокус ещё не дошёл до поля (Mp8)
    if (status) {
      const n = fields.filter((f) => !isValid(f)).length;
      status.textContent = n === 1
        ? 'Одно поле заполнено неверно'
        : `Полей заполнено неверно: ${n}`;
    }

    firstInvalid.focus();
  });
}

document.querySelectorAll('form[data-form]').forEach(initForm);

// ── Квиз на странице услуги (задача 88; сюда — задачей 99) ──
//
// Разметка и настройки — Quiz.astro и src/data/quizzes/. Здесь, а не
// своим файлом quiz.js: с виджетом Turnstile на страницах с квизом
// скриптов стало бы 7 при бюджете 6 (budget.json, T6). Решение Марата
// 15.10, как черновик формы выше.
//
// Что делает: показывает вопрос за вопросом, помнит ответы, по ним
// открывает пункты результата (data-quiz-when), переносит ответы
// текстом в поле «Задача» формы заявки этой страницы и сообщает
// goals.js о ходе: старт, дошёл до шага N, результат.
//
// Чего НЕ делает: не отправляет ничего сам и не пишет текст на страницу —
// всё содержимое уже в разметке. Счётчик не трогает: цели и параметры
// ставит goals.js по событию quiz:progress, после согласия (An2).
//
// Всё — внутри функции: обычные скрипты делят одну глобальную область
// (см. goals.js), а имена квиза вне её не нужны

(() => {
  // Шаг → набор вариантов. Условие пункта — массив «или», внутри — «и»
  const подходит = (условия, ответы) => условия.some((у) =>
    Object.entries(у).every(([шаг, варианты]) => варианты.includes(ответы[шаг])));

  const сообщить = (квиз, этап) => document.dispatchEvent(
    new CustomEvent('quiz:progress', { detail: { quiz: квиз, stage: этап } }));

  function initQuiz(блок) {
    const тело = блок.querySelector('[data-quiz-body]');
    const запас = блок.querySelector('[data-quiz-fallback]');
    const шаги = [...блок.querySelectorAll('[data-quiz-step]')];
    const результат = блок.querySelector('[data-quiz-result]');
    const полоса = [...блок.querySelectorAll('.quiz-progress li')];
    if (!тело || !результат || !шаги.length) return;

    const квиз = блок.dataset.quiz;
    const ответы = {};
    // Ход квиза — в Метрику по разу за загрузку страницы: «Назад» и
    // повторное прохождение воронку не раздувают
    const сообщено = new Set();
    const отметить = (этап) => {
      if (сообщено.has(этап)) return;
      сообщено.add(этап);
      сообщить(квиз, этап);
    };
    // Текст, который квиз уже положил в заявку: при повторном переносе
    // меняется он, а не дописывается второй
    let перенесено = '';

    // Номер показанного: 0…N−1 — шаги, N — результат
    let текущий = 0;

    const показать = (номер, фокус) => {
      текущий = номер;
      шаги.forEach((ш, i) => { ш.hidden = i !== номер; });
      результат.hidden = номер !== шаги.length;
      полоса.forEach((п, i) => {
        п.toggleAttribute('data-done', i < номер);
        п.toggleAttribute('data-current', i === номер);
      });
      if (номер === шаги.length) {
        for (const пункт of результат.querySelectorAll('[data-quiz-when]')) {
          let условия = [];
          try { условия = JSON.parse(пункт.dataset.quizWhen); } catch { /* разметку пишет сборка */ }
          пункт.hidden = !подходит(условия, ответы);
        }
        отметить('result');
      } else if (номер > 0) {
        отметить(`step_${номер + 1}`);
      }
      // Фокус — на заголовок нового вопроса: программа чтения услышит
      // номер и вопрос, Tab пойдёт по вариантам. При загрузке не трогаем
      if (фокус) {
        const заголовок = (номер === шаги.length ? результат : шаги[номер]).querySelector('h3');
        заголовок?.focus({ preventScroll: true });
        // Блок мог уехать под шапку: вопрос — в окно, без рывка
        const r = тело.getBoundingClientRect();
        if (r.top < 0 || r.top > innerHeight * 0.6) {
          тело.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
      }
    };

    // Ответы для заявки: вопрос — вариант, по строке на шаг
    const текстОтветов = () => [
      `${блок.dataset.quizTitle}:`,
      ...шаги.map((ш) => {
        const вопрос = ш.querySelector('.quiz-question')?.textContent.trim();
        const выбран = ш.querySelector('.quiz-option[aria-pressed="true"]')?.textContent.trim();
        return `— ${вопрос} ${выбран ?? '—'}`;
      }),
    ].join('\n');

    тело.addEventListener('click', (e) => {
      const цель = e.target instanceof Element ? e.target : null;
      if (!цель) return;

      const вариант = цель.closest('.quiz-option');
      if (вариант) {
        const шаг = вариант.closest('[data-quiz-step]');
        for (const в of шаг.querySelectorAll('.quiz-option')) {
          в.setAttribute('aria-pressed', String(в === вариант));
        }
        ответы[шаг.dataset.quizStep] = вариант.dataset.quizValue;
        if (шаги.indexOf(шаг) === 0) отметить('start');
        показать(шаги.indexOf(шаг) + 1, true);
        return;
      }

      if (цель.closest('[data-quiz-back]')) {
        показать(Math.max(0, текущий - 1), true);
        return;
      }

      if (цель.closest('[data-quiz-restart]')) {
        for (const ключ of Object.keys(ответы)) delete ответы[ключ];
        for (const в of тело.querySelectorAll('.quiz-option')) в.setAttribute('aria-pressed', 'false');
        показать(0, true);
        return;
      }

      const отправить = цель.closest('[data-quiz-send]');
      if (отправить) {
        const форма = document.querySelector('#zayavka form[data-form]');
        const задача = форма?.querySelector('textarea[name="task"]');
        if (!форма || !задача) return;
        const текст = текстОтветов();
        // Своё описание человека не стираем: ответы — над ним
        const своё = (перенесено && задача.value.includes(перенесено)
          ? задача.value.replace(перенесено, '') : задача.value).trim();
        задача.value = своё ? `${текст}\n\n${своё}` : текст;
        перенесено = текст;
        // Черновик формы (form.js) запишется с первым вводом человека.
        // Событие input здесь не шлём: goals.js счёл бы его стартом
        // заполнения, а заполнения ещё не было
        if (место) {
          откуда = { форма, родитель: форма.parentNode, следующий: форма.nextSibling, кнопка: отправить };
          переставить(форма, место, null);
          // showModal ставит фокус на крестик и докручивает к нему
          // документ — страница под окном уезжала на 170–200 px (Chrome,
          // 390, зонд tools/прокрутка-окна-164б.mjs). Возвращаем, где была
          // Фокус — на заголовок окна, как у вопросов квиза: программа
          // чтения услышит, где человек, Tab пойдёт по полям. Не в первое
          // поле: на телефоне клавиатура сразу закрыла бы полокна вместе
          // со строкой об ответах (проверяющий 164б)
          const было = scrollY;
          окно.showModal();
          окно.querySelector('h2')?.focus({ preventScroll: true });
          if (scrollY !== было) scrollTo({ top: было, behavior: 'instant' });
        } else {
          // Окна нет — к форме на странице, как до задачи 164б
          форма.querySelector('input:not([type="hidden"]):not([tabindex="-1"]), textarea')?.focus();
        }
      }
    });

    // ── Окно с формой заявки (задача 164б) ──
    // Форма одна: в окно переезжает та же #zayavka, при закрытии — назад,
    // на прежнее место, со всем введённым. Порядок форм в документе не
    // меняется (окно выше карточки заявки, обратный звонок ниже обеих) —
    // ключ черновика с номером формы тот же.
    // moveBefore переносит, не вынимая из документа: рамка виджета
    // Turnstile внутри формы не перезагружается. Без него — обычная
    // вставка, и виджет грузится заново: тогда ему сброс (подключение
    // виджета ждёт вопроса 5а юристу — при подключении сверить сброс по
    // документации Cloudflare)
    const окно = блок.querySelector('[data-quiz-dialog]');
    const место = окно && typeof окно.showModal === 'function'
      ? окно.querySelector('[data-quiz-dialog-form]') : null;
    let откуда = null;

    function переставить(форма, родитель, перед) {
      if (typeof родитель.moveBefore === 'function') {
        try { родитель.moveBefore(форма, перед); return; } catch { /* ниже — обычная вставка */ }
      }
      родитель.insertBefore(форма, перед);
      const виджет = форма.querySelector('.cf-turnstile');
      try { if (виджет && window.turnstile) window.turnstile.reset(виджет); } catch { /* виджет не отрисован */ }
    }

    if (место) {
      окно.querySelector('[data-quiz-dialog-close]')?.addEventListener('click', () => окно.close());
      // Клик по затемнению: событие приходит на сам диалог — отличаем по
      // координатам, как у окна обратного звонка (consent.js)
      окно.addEventListener('click', (e) => {
        if (e.target !== окно) return;
        const р = окно.getBoundingClientRect();
        if (e.clientX < р.left || e.clientX > р.right || e.clientY < р.top || e.clientY > р.bottom) окно.close();
      });
      // Закрытие любым путём — крестик, Esc, затемнение. Фокус — на кнопку,
      // которой окно открыли: сам браузер вернул бы его на заголовок
      // результата, куда квиз поставил фокус до нажатия (Safari кнопку
      // при нажатии фокусом не отмечает)
      окно.addEventListener('close', () => {
        if (!откуда) return;
        const { форма, родитель, следующий, кнопка } = откуда;
        откуда = null;
        переставить(форма, родитель, следующий);
        кнопка.focus();
      });
    }

    запас.hidden = true;
    тело.hidden = false;
    показать(0, false);
  }

  document.querySelectorAll('[data-quiz]').forEach(initQuiz);
})();
