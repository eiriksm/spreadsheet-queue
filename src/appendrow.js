module.exports = sendToGoogleDocs;

function sendToGoogleDocs(data, sheet, callback) {

  var _cb = function(err, rs) {
    if (callback) {
      callback(err, res);
    }
  };

  // Append new row
  if (!data.time) {
    data.time = Date.now();
  }
  sheet.add({
    time: data.time,
    value: data.value
  }, _cb);

}
