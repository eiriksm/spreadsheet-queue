var Hapi = require('hapi');

var Spreadsheet = require('google-spreadsheet-append-es5');
var spreadsheet = Spreadsheet({
      auth: {
        email: process.env.EMAIL,
        key: 'nokey.pem'
      },
      fileId: process.env.FILE_ID
  });
var server = new Hapi.Server(null, 8000);

server.route({
  method: 'POST',
      path: '/temp',
      handler: function (request, reply) {
        sendToGoogleDocs(request.payload);
        reply('ok');
      }
});

server.start();

function sendToGoogleDocs(data) {

  // append new row
  spreadsheet.add({time: Date.now(), value: data.temp}, function(er,res) {
    console.log(er, res);  
  });
 
}
