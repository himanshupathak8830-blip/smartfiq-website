const BOT_USER_AGENTS = [
  { key: 'googlebot', name: 'Googlebot', category: 'Search Engine' },
  { key: 'bingbot', name: 'Bingbot', category: 'Search Engine' },
  { key: 'yandex', name: 'YandexBot', category: 'Search Engine' },
  { key: 'duckduckbot', name: 'DuckDuckBot', category: 'Search Engine' },
  { key: 'baiduspider', name: 'Baiduspider', category: 'Search Engine' },
  { key: 'ahrefsbot', name: 'AhrefsBot', category: 'SEO Tool' },
  { key: 'semrushbot', name: 'SemrushBot', category: 'SEO Tool' },
  { key: 'lighthouse', name: 'Google Lighthouse', category: 'Audit Tool' },
  { key: 'facebookexternalhit', name: 'Facebook Bot', category: 'Social Bot' },
  { key: 'twitterbot', name: 'Twitterbot', category: 'Social Bot' },
  { key: 'python-requests', name: 'Python Requests Script', category: 'Script/Crawler' },
  { key: 'curl', name: 'cURL Command', category: 'CLI Tool' },
  { key: 'wget', name: 'Wget Command', category: 'CLI Tool' }
];

function getClientIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
}

function parseVisitorInfo(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const ip = getClientIp(req);

  // 1. Bot Detection
  let is_bot = false;
  let bot_name = 'Human User';
  let bot_category = 'None';

  for (const bot of BOT_USER_AGENTS) {
    if (ua.includes(bot.key)) {
      is_bot = true;
      bot_name = bot.name;
      bot_category = bot.category;
      break;
    }
  }

  // 2. Device Type & Model
  let device_type = 'Desktop';
  let device_model = 'Unknown';
  let os = 'Unknown';
  let browser = 'Unknown';

  if (/iphone|android|mobile|ipod|blackberry|windows phone/i.test(ua)) {
    if (/ipad|tablet|playbook|silk/i.test(ua)) {
      device_type = 'Tablet';
    } else {
      device_type = 'Mobile';
    }
  } else if (/ipad|tablet|playbook|silk/i.test(ua)) {
    device_type = 'Tablet';
  } else if (ua.length > 0) {
    device_type = 'Desktop';
  } else {
    device_type = 'Unknown';
  }

  if (ua.includes('iphone')) device_model = 'iPhone';
  else if (ua.includes('ipad')) device_model = 'iPad';
  else if (ua.includes('android')) device_model = 'Android Device';
  else if (ua.includes('macintosh') || ua.includes('mac os')) device_model = 'Mac';
  else if (ua.includes('windows')) device_model = 'Windows PC';
  else if (ua.includes('linux')) device_model = 'Linux PC';

  if (ua.includes('mac OS') || ua.includes('macintosh')) os = 'macOS';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';
  else if (ua.includes('linux')) os = 'Linux';

  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg/')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';

  // 3. India vs International GeoIP
  const countryHeader = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'];
  let country = 'Unknown';
  let country_code = 'XX';
  let country_type = 'Unknown';

  if (countryHeader) {
    country_code = String(countryHeader).toUpperCase();
    if (country_code === 'IN' || country_code === 'IND') {
      country = 'India';
      country_type = 'Indian';
    } else {
      country = country_code;
      country_type = 'International';
    }
  } else if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
    country = 'India (Localhost)';
    country_code = 'IN';
    country_type = 'Indian';
  } else {
    country = 'Unknown';
    country_code = 'XX';
    country_type = 'Unknown';
  }

  return {
    ip_address: ip,
    country,
    country_code,
    country_type,
    city: 'Unknown',
    region: 'Unknown',
    timezone: country_type === 'Indian' ? 'IST' : 'UTC',
    isp: 'Telecom/Network',
    visitor_type: is_bot ? 'Bot' : 'Human',
    is_bot,
    bot_name,
    bot_category,
    device_type,
    device_model,
    browser,
    os,
    user_agent: req.headers['user-agent'] || ''
  };
}

module.exports = {
  getClientIp,
  parseVisitorInfo
};
