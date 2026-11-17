// Закрытая копия для собственника (tools/demo.mjs, задача 128).
// В боевой сборке этого файла нет
window.addEventListener('submit', (e) => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const status = form.querySelector('[role="status"]');
  if (status) status.textContent = "Это закрытая копия для просмотра — заявки не отправляются";
}, true);
