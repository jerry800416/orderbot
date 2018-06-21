var zipFolder = require('zip-folder');
var path = require('path');
var fs = require('fs');
var request = require('request');

var rootFolder = path.resolve('.');
var zipPath = path.resolve(rootFolder, '../azure-bot-61885ed.zip');
var kuduApi = 'https://azure-bot-61885ed.scm.azurewebsites.net/api/zip/site/wwwroot';
var userName = '$azure-bot-61885ed';
var password = 'SdJ7m1H8gdowH3y2etqmRkcc0sp7TJAaL5tQKpx2TeLRTN1Kgc1uRNiitFJK';

function uploadZip(callback) {
  fs.createReadStream(zipPath).pipe(request.put(kuduApi, {
    auth: {
      username: userName,
      password: password,
      sendImmediately: true
    },
    headers: {
      "Content-Type": "applicaton/zip"
    }
  }))
  .on('response', function(resp){
    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      fs.unlink(zipPath);
      callback(null);
    } else if (resp.statusCode >= 400) {
      callback(resp);
    }
  })
  .on('error', function(err) {
    callback(err)
  });
}

function publish(callback) {
  zipFolder(rootFolder, zipPath, function(err) {
    if (!err) {
      uploadZip(callback);
    } else {
      callback(err);
    }
  })
}

publish(function(err) {
  if (!err) {
    console.log('azure-bot-61885ed publish');
  } else {
    console.error('failed to publish azure-bot-61885ed', err);
  }
});