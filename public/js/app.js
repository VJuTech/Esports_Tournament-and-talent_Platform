const menuButton = document.querySelector('.dashboard-menu');

if (menuButton) {
  menuButton.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });
}

const activityMenuButton = document.querySelector('.activity-menu-button');
const activityMenuList = document.querySelector('.activity-menu-list');

function closeActivityMenu() {
  if (!activityMenuButton || !activityMenuList) return;
  activityMenuList.hidden = true;
  activityMenuButton.setAttribute('aria-expanded', 'false');
}

if (activityMenuButton && activityMenuList) {
  activityMenuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = activityMenuButton.getAttribute('aria-expanded') === 'true';
    activityMenuList.hidden = isOpen;
    activityMenuButton.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (event) => {
    if (!activityMenuList.contains(event.target) && event.target !== activityMenuButton) closeActivityMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeActivityMenu();
      activityMenuButton.focus();
    }
  });
}

const tournamentForm = document.querySelector('.management-form');
const timezoneOffsetInput = document.getElementById('clientTimezoneOffsetMinutes');

if (tournamentForm && timezoneOffsetInput) {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  const pad = (value) => String(value).padStart(2, '0');

  timezoneOffsetInput.value = String(timezoneOffsetMinutes);
  tournamentForm.querySelectorAll('input[type="datetime-local"]').forEach((input) => {
    if (!input.value) return;
    const [datePart, timePart] = input.value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute) - timezoneOffsetMinutes * 60 * 1000);
    input.value = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;
  });
  tournamentForm.addEventListener('submit', () => {
    timezoneOffsetInput.value = String(new Date().getTimezoneOffset());
  });
}

document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
});
