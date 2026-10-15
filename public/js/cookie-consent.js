const consentBanner = document.querySelector('[data-cookie-consent]');
const consentKey = 'champion-lounge-cookie-consent';

if (consentBanner && !document.cookie.split('; ').some((entry) => entry.startsWith(`${consentKey}=`))) {
  consentBanner.hidden = false;
  document.body.classList.add('consent-required');
}

document.querySelectorAll('[data-cookie-choice]').forEach((button) => {
  button.addEventListener('click', () => {
    const selection = button.dataset.cookieChoice;
    document.cookie = `${consentKey}=${selection}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    consentBanner.hidden = true;
    document.body.classList.remove('consent-required');
  });
});
