function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  return cleaned.length >= 7 && cleaned.length <= 15;
}

function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function validateLeadPayload(payload) {
  const errors = [];
  const fullName = sanitizeText(payload.fullName || payload.full_name || payload.name);
  const email = (payload.business_email || payload.email || '').trim();
  const phone = (payload.phone_number || payload.phone || '').trim();

  if (!fullName) errors.push('Full name is required.');
  if (email && !isValidEmail(email)) errors.push('Invalid email address format.');
  if (!email && !phone) errors.push('Either email or phone number is required.');

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      full_name: fullName || 'Anonymous Lead',
      business_email: email,
      phone_number: phone,
      budget: sanitizeText(payload.budget || 'Unspecified'),
      requirement_details: sanitizeText(payload.requirement_details || payload.requirements || payload.message || ''),
      source: sanitizeText(payload.source || 'Website Form')
    }
  };
}

module.exports = {
  isValidEmail,
  isValidPhone,
  sanitizeText,
  validateLeadPayload
};
