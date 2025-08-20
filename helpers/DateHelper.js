class DateHelper {
  /**
   * Convert duration string to milliseconds
   * @param {string} duration - Duration string (e.g., "1d", "2h", "30m", "45s")
   * @returns {number} Milliseconds
   */
  static toMs(duration) {
    if (!duration) return 0;

    const num = parseInt(duration);
    if (isNaN(num)) return 0;

    if (duration.endsWith("d")) return num * 24 * 60 * 60 * 1000;
    if (duration.endsWith("h")) return num * 60 * 60 * 1000;
    if (duration.endsWith("m")) return num * 60 * 1000;
    if (duration.endsWith("s")) return num * 1000;
    return num;
  }

  /**
   * Add duration to current date
   * @param {string} duration - Duration string
   * @returns {Date} New date with duration added
   */
  static addToNow(duration) {
    return new Date(Date.now() + this.toMs(duration));
  }

  /**
   * Check if a date is expired (in the past)
   * @param {Date} date - Date to check
   * @returns {boolean} True if expired
   */
  static isExpired(date) {
    if (!date) return true;
    return date < new Date();
  }

  /**
   * Get remaining time in milliseconds
   * @param {Date} date - Future date
   * @returns {number} Remaining milliseconds (0 if expired)
   */
  static getRemainingMs(date) {
    if (this.isExpired(date)) return 0;
    return date.getTime() - Date.now();
  }

  /**
   * Format date to ISO string without milliseconds
   * @param {Date} date - Date to format
   * @returns {string} Formatted ISO string
   */
  static toCleanISO(date) {
    if (!date) return null;
    return date.toISOString().split(".")[0] + "Z";
  }

  /**
   * Create date from Unix timestamp
   * @param {number} timestamp - Unix timestamp in seconds
   * @returns {Date} Date object
   */
  static fromUnix(timestamp) {
    return new Date(timestamp * 1000);
  }

  /**
   * Convert date to Unix timestamp
   * @param {Date} date - Date to convert
   * @returns {number} Unix timestamp in seconds
   */
  static toUnix(date) {
    if (!date) return null;
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * Get start of day (00:00:00)
   * @param {Date} date - Reference date
   * @returns {Date} Start of day
   */
  static startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get end of day (23:59:59.999)
   * @param {Date} date - Reference date
   * @returns {Date} End of day
   */
  static endOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * Check if two dates are the same day
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} True if same day
   */
  static isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Add days to a date
   * @param {Date} date - Original date
   * @param {number} days - Number of days to add
   * @returns {Date} New date
   */
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Format date to human-readable string
   * @param {Date} date - Date to format
   * @param {string} locale - Locale string (default: 'en-US')
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string
   */
  static format(date, locale = "en-US", options = {}) {
    if (!date) return "";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    }).format(date);
  }
}

module.exports = DateHelper;
