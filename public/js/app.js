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
