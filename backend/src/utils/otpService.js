const logger = require('./logger');

/**
 * OTP Service - Generates and "sends" One-Time Passwords
 * Since we don't have a live SMS gateway, we log to console for development.
 */
const otpService = {
  /**
   * Generates a 6-digit numeric OTP
   * @returns {string} 6-digit code
   */
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * "Sends" an OTP via SMS (Mocked)
   * @param {string} phone The destination phone number
   * @param {string} code The 6-digit OTP
   * @returns {Promise<boolean>}
   */
  sendSMS: async (phone, code) => {
    logger.info(`[MOCK SMS] Sending OTP ${code} to ${phone}`);
    
    // In dev mode, we log clearly to the console so the user can see it
    console.log('\n------------------------------------------');
    console.log(`🛡️  FOODBRIDGE OTP: ${code}`);
    console.log(`📱 TO: ${phone}`);
    console.log('------------------------------------------\n');
    
    return true;
  }
};

module.exports = otpService;
