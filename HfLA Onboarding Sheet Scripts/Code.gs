
function submit(s) {

  var theRow = s.range.getRow();

  var sheet = SpreadsheetApp.getActiveSheet();

  var range = sheet.getRange(theRow, 1, 1, 21)

  var rangeArray = range.getValues();


  if (rangeArray[0][0] != "") {//make sure Timestamp on the sheet exist

    
    //cop table id production
    var LINKED_TABLE_ID = "bXIzeO-0GAl7Vb8sbu8__z";

    // cop table id copy
    // var LINKED_TABLE_ID = "8_-H6-l3CwGeEpDxTAxOz9"

    // Old Data
    // linkedData format : ["tables/" + LINKED_TABLE_ID + "/rows/" + LINKED_ROW_IDS,"tables/" + LINKED_TABLE_ID + "/rows/"+ LINKED_ROW_IDS];
    // BEGIN "Copy of Volunteer" table row ids
  
    // var linkedDataDict = {
    //   "UI/UX"                : "tables/" + LINKED_TABLE_ID + "/rows/" +"avSxzeaEnRnbGxMRTnnO5V",
    //   "Product Management"   : "tables/" + LINKED_TABLE_ID + "/rows/" +"aH2b6AiUflS16QwOU5UkKu",
    //   "Dev Ops"              : "tables/" + LINKED_TABLE_ID + "/rows/" +"91VyYwsv7kT20b05z7UOpl",
    //   "Marketing"            : "tables/" + LINKED_TABLE_ID + "/rows/" +"aihwNV-EHMC6VsizvQBOg-",
    //   "Data Science"         : "tables/" + LINKED_TABLE_ID + "/rows/" +"aH6N16KzGLRfhJS2EhH4Uf",
    //   "Revenue"              : "tables/" + LINKED_TABLE_ID + "/rows/" +"9e-TpCf2udG1rckZrm24OF",
    //   "Engineering"          : "tables/" + LINKED_TABLE_ID + "/rows/" +"8qajQCa0Gsk1XhdRzeAOYf"
    // };
    // END "Copy of Volunteer" table row ids

   // Current links to various CoP rows
   // Data Science: https://tables.area120.google.com/table/bXIzeO-0GAl7Vb8sbu8__z/row/8xx7y1jY1xCeMYE6N_vO3s
   // Dev Ops: https://tables.area120.google.com/table/bXIzeO-0GAl7Vb8sbu8__z/row/8Fz-MtJKrdndLV_htWuORF
   // Engineering: https://tables.area120.google.com/table/bXIzeO-0GAl7Vb8sbu8__z/row/bUpm-RglJFB7OVpBY-j4kB
   // Marketing: https://tables.area120.google.com/table/bXIzeO-0GAl7Vb8sbu8__z/row/ac5CcFmWAyLdeo__8EQOm9
   // Product Management: https://tables.area120.google.com/table/bXIzeO-0GAl7Vb8sbu8__z/row/8j5ovXIPUJPc0HSt4JIO_E
   // Revenue: https://tables.area120.google.com/table/bXIzeO-0GAl7Vb8sbu8__z/row/bncVnFwX_sofA204q4tk7O
   // UI/UX: https://tables.area120.google.com/table/bXIzeO-0GAl7Vb8sbu8__z/row/aq1874wKl9H8KNGeMkK_nD

    // Production Volunteer table row ids
    var linkedDataDict = {
      "UI/UX"                : "tables/" + LINKED_TABLE_ID + "/rows/" + "aq1874wKl9H8KNGeMkK_nD",
      "Product Management"   : "tables/" + LINKED_TABLE_ID + "/rows/" + "8j5ovXIPUJPc0HSt4JIO_E",
      "Dev Ops"              : "tables/" + LINKED_TABLE_ID + "/rows/" + "8Fz-MtJKrdndLV_htWuORF",
      "Marketing"            : "tables/" + LINKED_TABLE_ID + "/rows/" + "ac5CcFmWAyLdeo__8EQOm9",
      "Data Science"         : "tables/" + LINKED_TABLE_ID + "/rows/" + "8xx7y1jY1xCeMYE6N_vO3s",
      "Revenue"              : "tables/" + LINKED_TABLE_ID + "/rows/" + "bncVnFwX_sofA204q4tk7O",
      "Engineering"          : "tables/" + LINKED_TABLE_ID + "/rows/" + "bUpm-RglJFB7OVpBY-j4kB"
    };
    //rangeArray[0][11] is the Community of Pratice column in the sheet
    let copname=rangeArray[0][11].split(", ");

    //array of linkedData from copname
    let coprelation=[];

    //contruct array of linkedData from copname
    for (let i = 0; i < copname.length; i++) {
      coprelation.push(linkedDataDict[copname[i]]);
    }

    const newRow = {
        // format:     case-sensitive titles of the table column: the column position in a row 

      "name_first": rangeArray[0][1],

      "name_last": rangeArray[0][2],

      "Gmail": rangeArray[0][3],
      
      "preferred_email": rangeArray[0][4],
      
      "phone": rangeArray[0][5].toString(),               //convert number to string

      "texting_ok": rangeArray[0][6]=="Yes"? true:false,  //convert Yes  in to boolean type

      "slack_name": rangeArray[0][7],

      "slack_id": rangeArray[0][8],

      "github_handle": rangeArray[0][9],

      "linkedin": rangeArray[0][10],
      // The key here must pertain to the relationship title for this column, not the relation column name
      // otherwise, this will not work as expected.
      "cop-volunteers": coprelation,

      "job_title_current": rangeArray[0][12],

      "job_title_target": rangeArray[0][13],

      "time_zone": rangeArray[0][14],

      "conduct": rangeArray[0][15]=="Yes"? true:false,   //convert Yes  in to boolean type

      "Enter Passphrase": rangeArray[0][16],

      "referred_by": rangeArray[0][17],

      "zoom_email": rangeArray[0][20]

    }
    
    console.log(newRow);
    makeRow(newRow);
    Logger.log(newRow);
    
  }

}

function makeRow(rowValues) {

  // TablesID uses the Table ID, not the workspace ID
  // Volunteers's table id
  var tablesID = 'a8Fi8xyvbbq0gWnJv5p_tB'; 
  // Copy of Volunteer's table id
  // var tablesID = 'bSD9BwoLsQD0Pz0fkYmkrM'

 
  // This prepends "tables/" before the ID for the create call
  var tableName = "tables/" + tablesID;

 
  // Write to the table

  // rowValues is an object created from the Sheets row in the create function below

  console.log(Area120Tables.Tables.Rows.create({values: rowValues}, tableName));

}