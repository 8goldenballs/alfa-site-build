// Подсветка под курсором — эффект 4 из stack-astro/MOTION_astro.md.
//
// Обычный скрипт, не остров (A1). Только ставит координаты курсора
// в переменные карточки, рисует стиль .spot::before в base.css.
// Декоративный: без скрипта и на сенсорном экране подсветки просто нет,
// поэтому обработчики вешаются только там, где основной ввод — указатель.
// Точечно, на 6–8 карточек страницы: обработчик движения на сотне
// элементов заметен в отзывчивости

if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.spot').forEach((карточка) => {
    карточка.addEventListener('pointermove', (e) => {
      const r = карточка.getBoundingClientRect();
      карточка.style.setProperty('--x', `${e.clientX - r.left}px`);
      карточка.style.setProperty('--y', `${e.clientY - r.top}px`);
    });
  });
}
