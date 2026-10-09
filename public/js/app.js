const menuButton = document.querySelector('.dashboard-menu');

if (menuButton) {
  menuButton.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });
}
