const ZOOM_ACCOUNT_ID = getScriptSecret("ZOOM_ACCOUNT_ID");
const ZOOM_CLIENT_ID = getScriptSecret("ZOOM_CLIENT_ID");
const ZOOM_CLIENT_SECRET = getScriptSecret("ZOOM_CLIENT_SECRET");   
const ZOOM_USER_ID = getScriptSecret("ZOOM_USER_ID");

function Run() {
    Logger.log("Hello world");
    Logger.log("goodbye world");
    var webinars = [];
    var webinarId;
    var attendees = [];
    Logger.log("Test 123123123 5/14/2025")
    Logger.log("Test 33333333333 7/31/2025")
    webinars = listAllWebinars();//call zoom API to list all webinars
    Logger.log("-----------output1------------All Webinars ")
    Logger.log(webinars); // Log the meetings or process them accordingly
   
    
  }
  
  function listAllWebinars() {
    var webinars = [];
    var pageToken = "";
    var pageSize = 30; // Adjust if needed
  
    do {
      var url = `https://api.zoom.us/v2/users/${ZOOM_USER_ID}/webinars?page_size=${pageSize}&next_page_token=${pageToken}`;
      var response = accessProtectedResource(url, 'get');
      var res = JSON.parse(response);
      
      if (res.webinars && res.webinars.length > 0) {
        webinars = webinars.concat(res.webinars);
      }
      pageToken = res.next_page_token;
    } while (pageToken);
    
    return webinars;
  }

  // Retrieves secret from the Script Properties or throws an error
  function getScriptSecret(key) {

    let secret = PropertiesService.getScriptProperties().getProperty(key)
  
    if (!secret) throw Error(`Secret ${key} is empty`)
  
    return secret
  
  }
  
  
  //zoom Oauth call
  function accessProtectedResource(url, method_opt, headers_opt) {
    var token = getClientCredentialsToken();  // Get the token
    var method = method_opt || 'get';
    var headers = headers_opt || {};
    headers['Authorization'] = 'Bearer ' + token;
  
    var resp = UrlFetchApp.fetch(url, {
      'headers': headers,
      'method': method,
      'muteHttpExceptions': true,
    });
  
    var code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      return resp.getContentText("utf-8"); // Success
    } else if (code == 401 || code == 403) {
      // Not authorized or token expired
      Logger.log("Authorization failed");
    } else {
      console.error("Error (%s): %s", code.toString(), resp.getContentText("utf-8"));
      throw ("Backend server error: " + code);
    }
  }
  
  function getClientCredentialsToken() {
    var url = 'https://zoom.us/oauth/token';
    var payload = {
      'grant_type': 'account_credentials',
      'account_id': ZOOM_ACCOUNT_ID
    };
  
    var options = {
      'method': 'post',
      'payload': payload,
      'headers': {
        'Authorization': 'Basic ' + Utilities.base64Encode(ZOOM_CLIENT_ID + ':' + ZOOM_CLIENT_SECRET)
      }
    };
  
    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());
    //Logger.log(result.access_token);
    return result.access_token;
  }
  
  // Function sends an error email message to tables@hackforla.org if an error occurs in the onboarding process
  function errorMessage(subject, error) {
    let message = error;
    MailApp.sendEmail("tables@hackforla.org", subject, message);
  }