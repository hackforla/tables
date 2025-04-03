const FORM_ID = '17tJV20Kwqb7CsqDYU9IwcRWHzAKhRUuPnMNxpmG-TCU';//test ID

function openForm() {
  var form = FormApp.openById(FORM_ID);
  form.setAcceptingResponses(true);
  Logger.log('Form opened at ' + new Date());
}

function closeForm() {
  var form = FormApp.openById(FORM_ID);
  form.setAcceptingResponses(false);
  Logger.log('Form closed at ' + new Date());
}