const pages = {
  about: {
    title: 'About Champion Lounge',
    eyebrow: 'Our purpose',
    heading: 'Built for competitors with ambition.',
    copy: 'Champion Lounge connects trusted competition, verified performance, and meaningful player opportunity in one professional esports platform.'
  },
  contact: {
    title: 'Contact Champion Lounge',
    eyebrow: 'Support',
    heading: 'We are here to help.',
    copy: 'For account, tournament, payment, and platform support, contact the Champion Lounge team at support@championlounge.com.'
  },
  privacy: {
    title: 'Privacy policy',
    eyebrow: 'Your information',
    heading: 'Privacy is part of fair play.',
    copy: 'Champion Lounge collects only the information needed to operate accounts, tournaments, payments, and support. We restrict internal scouting information to authorized personnel and never sell player data.'
  },
  terms: {
    title: 'Terms of service',
    eyebrow: 'Platform terms',
    heading: 'Clear rules for every competitor.',
    copy: 'By using Champion Lounge, you agree to provide accurate account information, follow published competition rules, and use the platform responsibly. Tournament-specific terms apply alongside these platform terms.'
  }
};

function show(page) {
  return (req, res) => res.render('static-page', pages[page]);
}

module.exports = { show };
