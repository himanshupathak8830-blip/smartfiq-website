function generateId(prefix = 'GEN') {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}${random}`;
}

function generateLeadId() {
  return generateId('LD');
}

function generateUserId() {
  return generateId('USR');
}

function generateLogId() {
  return generateId('SL');
}

function generateVisitorId() {
  return generateId('VIS');
}

function generateAppointmentId() {
  return generateId('APT');
}

module.exports = {
  generateId,
  generateLeadId,
  generateUserId,
  generateLogId,
  generateVisitorId,
  generateAppointmentId
};
