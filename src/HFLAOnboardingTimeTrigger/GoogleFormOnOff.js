const FORM_ID = '1vZZQC9PX-F4wmORhM4X7ZtfFhj7v1qDRRUZPwKIrMLk'; //HFLA onboarding https://docs.google.com/forms/d/1nFiL45x2AG3mxebCAvoVeW_MdkSKrHja4Q_fOKRhgZk/edit#responses
const WEBSITE_FORM_ID = '1nFiL45x2AG3mxebCAvoVeW_MdkSKrHja4Q_fOKRhgZk'
/**
 * Opens the HFLA onboarding and website forms.
 */
function openForm() {
  var form1 = FormApp.openById(FORM_ID);
  var form2 = FormApp.openById(WEBSITE_FORM_ID);
  form1.setAcceptingResponses(true);
  form2.setAcceptingResponses(true);
  Logger.log('Forms opened at ' + new Date());
}
/**
 * Closes the HFLA onboarding and website forms.
 */
function closeForm() {
  var form1 = FormApp.openById(FORM_ID);
  var form2 = FormApp.openById(WEBSITE_FORM_ID);
  form1.setAcceptingResponses(false);
  form2.setAcceptingResponses(false);
  Logger.log('Forms closed at ' + new Date());
}