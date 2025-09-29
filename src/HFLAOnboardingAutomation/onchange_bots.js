/**
 * Handles spreadsheet change events to trigger onboarding, modified column updates, or schedule updates.
 * @param {Object} e - The change event object with changeType and range properties.
 * Supported changeType values:
 *   - EDIT: Cell value changes, borders, merges, in-cell images.
 *   - FORMAT: Cell value format, font/background colors.
 *   - OTHER: Inserting charts, over-cell images.
 *   - INSERT_ROW: New row added.
 *   - REMOVE_ROW: Row removed.
 *   - INSERT_COLUMN: New column added.
 *   - REMOVE_COLUMN: Column removed.
 *   - INSERT_GRID: New sheet added.
 *   - REMOVE_GRID: Sheet removed.
 */
function onChange(e) {
  Logger.log(`onChange type: ${e.changeType}`);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var range = ss.getActiveRange();
  if (!range) {
    throw new Error('No active range found for EDIT');
  }

  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();

  try {
    switch (e.changeType) {
      case 'EDIT':
        Logger.log("Processing EDIT");
        Logger.log(`Edited sheet: ${sheetName}`);

        if (sheetName === CONFIG.SHEET_NAMES.VOLUNTEERS) {
          const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.VOLUNTEERS);
          // Skip row edits for header
          const editedRowID = range.getRow();
          if (editedRowID < 2) {
            Logger.log(`Header row edit (row ${editedRowID}) ignored`);
            return;
          }

          const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          // Define the columns to monitor (1-based indexing based on schema)
          const monitoredColumns = [
            'name_first',
            'name_last',
            'preferred_email',
            'Gmail',
            'github_handle',
            'cop_name',
            'conduct',
            'Enter Passphrase',
            'linkedin',
            'zoom_email',
            'attn-verified'
          ].map(col => headers.indexOf(col) + 1).filter(col => col > 0);
          
          if (monitoredColumns.length !== 11) {
            throw new Error(`Missing monitored columns in Volunteers sheet: found ${monitoredColumns.length} of 11 expected`);
          }

          // Check if the edited range overlaps with monitored columns
          const editedColumnStart = range.getColumn();
          const editedColumnEnd = range.getLastColumn();
          const isMonitored = monitoredColumns.some(col => col >= editedColumnStart && col <= editedColumnEnd);

          if (isMonitored) {
            Logger.log(`Row ${editedRowID} edited in monitored columns: Calling onboard with row_id: ${editedRowID}`);

            const lastModifiedByColumn = headers.indexOf('last_modified_by') + 1;
            const lastModifiedColumn = headers.indexOf('last_modified') + 1;
            if (lastModifiedByColumn <= 0 || lastModifiedColumn <= 0) {
              throw new Error(`Missing columns: last_modified_by=${lastModifiedByColumn}, last_modified=${lastModifiedColumn}`);
            }

            const currentTime = Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'MMMM d, yyyy, h:mm:ss a z');

            //update last_modified_by with user who edited the row
            sheet.getRange(editedRowID, lastModifiedByColumn).setValue(Session.getActiveUser().getEmail()); 
            // Update last_modified with current formatted time
            sheet.getRange(editedRowID, lastModifiedColumn).setValue(currentTime);
            //onboard member with modified data again(including manual checking "attn-verified")
            onboard(editedRowID,"general");
            Logger.log(`Row ${editedRowID} edited in monitored columns: Updated last_modified_by and last_modified`);
          }
        } else if (sheetName === CONFIG.SHEET_NAMES.ONBOARDING_SCHEDULE) { 
          const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.ONBOARDING_SCHEDULE);
          const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          const monitoredColumns = ['date', 'on', 'off'].map(col => headers.indexOf(col) + 1).filter(col => col > 0);

          if (monitoredColumns.length !== 3) {
            throw new Error(`Missing monitored columns in Onboarding - Schedule sheet: found ${monitoredColumns.length} of 3 expected`);
          }
          // Check if the edited range overlaps with monitored columns
          const editedColumnStart = range.getColumn();
          const editedColumnEnd = range.getLastColumn();
          const isMonitored = monitoredColumns.some(col => col >= editedColumnStart && col <= editedColumnEnd);

          if (isMonitored) {
            Logger.log(`Monitored columns edited in Onboarding - Schedule: Calling setTrigger`);
            setOnboardingTrigger();
          }
        }
        break;

      case 'FORMAT':
      case 'OTHER':
      case 'INSERT_ROW':
      case 'REMOVE_ROW':
      case 'INSERT_COLUMN':
      case 'REMOVE_COLUMN':
      case 'INSERT_GRID':
        break;

      default:
        throw new Error(`Unknown change type: ${e.changeType}`);
    }
  } catch (error) {
    Logger.log(`onChange error: ${error.message}`);
    errorMessage(error.message, `Sheet: ${sheetName || 'unknown'}, Row: ${range?.getRow() || 'unknown'}`);
  }
}
/**
 * Calls the setTrigger function in the HFLAOnboardingTimeTrigger script.
 * @returns {Object} - { status: 'success'|'error', message: string }
 */
function setOnboardingTrigger() {
  try {
    const scriptId = CONFIG.SPREADSHEET_IDS.ONBOARDING_TIME_TRIGGER;
    const url = `https://script.googleapis.com/v1/scripts/${scriptId}:run`;
    const payload = {
      function: 'setTrigger',
      devMode: true
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    if (result.error) {
      throw new Error(`API error: ${JSON.stringify(result.error)}`);
    }

    Logger.log('Successfully called setTrigger');
    return { status: 'success', message: 'Successfully called setTrigger' };
  } catch (error) {
    Logger.log(`Error calling setTrigger: ${error.message}`);
    throw error;
  }
}

