module.exports = sendToGoogleDocs;

function sendToGoogleDocs(data, sheet, callback) {

  var _cb = function(err, rs) {
    if (callback) {
      callback(err, rs);
    }
  };

  // Append new row
  if (!data.time) {
    data.time = Date.now();
  }
  sheet.add(data, _cb);

}
