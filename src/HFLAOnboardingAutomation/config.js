/**
 * Retrieves environment variables from Script and User Properties.
 * @returns {Object} - The environment variables.
 * @throws {Error} - If required variables are missing.
 */
function getEnv() {
  const env = {
    ...PropertiesService.getScriptProperties().getProperties(),
    ...PropertiesService.getUserProperties().getProperties()
  };
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not defined in environment');
  }
  if (!env.GITHUB_ORG) {
    throw new Error('GITHUB_ORG not defined in environment');
  }
  if (!env.GITHUB_ORG_ID) {
    throw new Error('GITHUB_ORG_ID not defined in environment');
  }
  if (!env.ZOOM_ACCOUNT_ID) {
    throw new Error('ZOOM_ACCOUNT_ID not defined in environment');
  }
  if (!env.ZOOM_CLIENT_ID) {
    throw new Error('ZOOM_CLIENT_ID not defined in environment');
  }
  if (!env.ZOOM_CLIENT_SECRET) {
    throw new Error('ZOOM_CLIENT_SECRET not defined in environment');
  }
  if (!env.ZOOM_USER_ID) {
    throw new Error('ZOOM_USER_ID not defined in environment');
  }
  return env;
}
/**
 * Centralized configuration for the HFLA onboarding automation scripts.
 * @const {Object}
 */
const CONFIG = {
  // Spreadsheet IDs
  SPREADSHEET_IDS: {
    VOLUNTEERS: '15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw',
    ZOOM_REPORT: '1zYfTMyr0Yospj5hLjz0ZdX93llJ8Zy-JF_9k-cPUuW0', // "Part1_onboarding_zoom_attendee_report" in Drive Tables > Tables > Database
    ROLES: '1DCWo6ZLBGqIBK07k-uckVH-STcBAChzFGaBdVp8c-Kw',
    ONBOARDING_TIME_TRIGGER:"1uNXw1yX6g1O5wH7xFOqpA89yrD6EGx1c8tgRTRnQZvVeoP1NIbz9v_yr"
  },

  // Sheet GIDs
  SHEET_IDS: {
    VOLUNTEERS: 992054610,
    PROJECTS: 564488836,////https://docs.google.com/spreadsheets/d/15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw/edit?gid=564488836#gid=564488836
    ONBOARDING_SCHEDULE: 1700787930,
    COP: 1554512051,
    WEBSITE: 306592775,
    PROJECT_LOG: 1891272984,
    ROLE_PERMISSION: 0
  },
  // Sheet Names
  SHEET_NAMES:{
    VOLUNTEERS:"Volunteers",
    ONBOARDING_SCHEDULE:"Onboarding - Schedule"
  },

  // General settings
  TIME_ZONE: 'America/Los_Angeles',
  ERROR_EMAIL: 'tables@hackforla.org',
  ZOOM_REPORT_NAME: 'Part1_onboarding_zoom_attendee_report',
  ZOOM_ATTENDANCE_REF_ACCOUNT: 'zoom4@civictechstructure.org', // Reference Zoom account for comparing attendance duration
  ZOOM_ATTENDANCE_THRESHOLD: 0.83, // Need to attend at least 83% of full duration, i.e., at least 50 mins in a 60-min meeting
  PASSHRASE: 'strawberry',
  KNOWLEDGE_DRIVE_ID: '0ANa2FF5vnf3xUk9PVA',
  GITHUB_PROJECT_LOG_ISSUE_NUMBER: 391,

  // Website onboarding settings
  WEBSITE: {
    PROJECT_NAME: 'hackforla.org',
    GITHUB_TEAMS: ['website', 'website-write'],
    GITHUB_ROLE: 'member'
  },

  /**
   * Validates the configuration to ensure all required fields are present and valid.
   * Supports both function-based and RegExp-based validators.
   * @throws {Error} - If any required configuration is missing or invalid.
   */
  validate: function() {
    const required = [
      ['SPREADSHEET_IDS.VOLUNTEERS', this.SPREADSHEET_IDS.VOLUNTEERS, 'string'],
      ['SPREADSHEET_IDS.ZOOM_REPORT', this.SPREADSHEET_IDS.ZOOM_REPORT, 'string'],
      ['SPREADSHEET_IDS.ROLES', this.SPREADSHEET_IDS.ROLES, 'string'],
      ['SHEET_IDS.VOLUNTEERS', this.SHEET_IDS.VOLUNTEERS, 'number'],
      ['SHEET_IDS.PROJECTS', this.SHEET_IDS.PROJECTS, 'number'],
      ['SHEET_IDS.ONBOARDING_SCHEDULE', this.SHEET_IDS.ONBOARDING_SCHEDULE, 'number'],
      ['SHEET_IDS.COP', this.SHEET_IDS.COP, 'number'],
      ['SHEET_IDS.WEBSITE', this.SHEET_IDS.WEBSITE, 'number'],
      ['SHEET_IDS.PROJECT_LOG', this.SHEET_IDS.PROJECT_LOG, 'number'],
      ['SHEET_IDS.ROLE_PERMISSION', this.SHEET_IDS.ROLE_PERMISSION, 'number'],
      ['TIME_ZONE', this.TIME_ZONE, 'string'],
      ['ERROR_EMAIL', this.ERROR_EMAIL, 'string', /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
      ['ZOOM_REPORT_NAME', this.ZOOM_REPORT_NAME, 'string'],
      ['ZOOM_ATTENDANCE_REF_ACCOUNT', this.ZOOM_ATTENDANCE_REF_ACCOUNT, 'string', /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
      ['ZOOM_ATTENDANCE_THRESHOLD', this.ZOOM_ATTENDANCE_THRESHOLD, 'number', value => value > 0 && value <= 1],
      ['PASSHRASE', this.PASSHRASE, 'string'],
      ['KNOWLEDGE_DRIVE_ID', this.KNOWLEDGE_DRIVE_ID, 'string'],
      ['GITHUB_PROJECT_LOG_ISSUE_NUMBER', this.GITHUB_PROJECT_LOG_ISSUE_NUMBER, 'number'],
      ['WEBSITE.PROJECT_NAME', this.WEBSITE.PROJECT_NAME, 'string'],
      ['WEBSITE.GITHUB_TEAMS', this.WEBSITE.GITHUB_TEAMS, 'array', value => Array.isArray(value) && value.length > 0],
      ['WEBSITE.GITHUB_ROLE', this.WEBSITE.GITHUB_ROLE, 'string', value => ['member', 'maintainer'].includes(value)]
    ];

    for (const [key, value, type, validator] of required) {
      // Check for missing or empty values
      if (value === null || value === undefined || (type === 'string' && value === '') || (type === 'array' && !Array.isArray(value))) {
        throw new Error(`Configuration error: ${key} is missing or empty`);
      }
      // Check type for numbers
      if (type === 'number' && (isNaN(value) || typeof value !== 'number')) {
        throw new Error(`Configuration error: ${key} must be a valid number, got ${value}`);
      }
      // Validate using RegExp or function
      if (validator) {
        const isValid = validator instanceof RegExp ? validator.test(value) : validator(value);
        if (!isValid) {
          throw new Error(`Configuration error: ${key} is invalid, got ${value}`);
        }
      }
    }
  }
};

// Validate configuration on load
CONFIG.validate();