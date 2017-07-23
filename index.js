const Discord = require('discord.js');
const client = new Discord.Client();
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var myChannel;

var queryInterval = 10 * 60 * 1000;
var dayLength = 86400 * 1000;
var doc = new GoogleSpreadsheet('1he6sw3OHMArnJlZ40vrNk0YSx8gLTzyBd-6DaMExoNc');
var sheet;
var lastCount=0;
var count=0;
var lazyCount=0;

client.on('ready', () => {
  initLog();
  checkColumns();
  setInterval(checkLog, queryInterval);

  client.channels.forEach(channel => {
    // test 338550421251555338
    // thuglife 207234209339801601
    if(channel.id === '207234209339801601'){
      myChannel = channel;
    }

  });
});

client.on('message', function (message) {
  var text = message.content.toLocaleLowerCase();
    if (text.indexOf('feature') !== -1 && text.indexOf('request') !== -1) {
      myChannel.send("Fuck you");
    }
    else if(text.indexOf('#today') !== -1){
      checkColumns('day', new Date());
    }
    else if(text.indexOf('#doc') !== -1){
      myChannel.send("https://docs.google.com/spreadsheets/d/1he6sw3OHMArnJlZ40vrNk0YSx8gLTzyBd-6DaMExoNc");
    }
    else if(text.indexOf("#log") !== -1){
      checkColumns('log');
    }
});

function initLog(){
  checkLog(true)
}

function checkLog(initializing){  
    doc.getInfo((err, info) =>{
      sheet = info.worksheets[0];
      sheet.getCells({
      }, function( err, cells ){
        lastCount = count;
        count = 0;
        cells.forEach(function(cell) {
          if(cell.value.indexOf('work-') !== -1){
            count++;
          }
        }, this);
        if(initializing){
          console.log("Initialized with " + (count)*0.5 + " hours of work.")
          // myChannel.send("I'm watching you <@192841484939165696>");
          // myChannel.send("Initialized with " + (count)*0.5 + " hours of work.");
        } else{
          if(count > lastCount){
            console.log("Tej logged " + (count-lastCount)*0.5 + " new hours of work");
            myChannel.send("Tej logged " + (count-lastCount)*0.5 + " new hours of work");
            lazyCount = 0;
          } else if (count < lastCount){ 
            console.log("Tej removed " + (count-lastCount)*0.5 + " hours of work");
            myChannel.send("Tej removed " + (lastCount-count)*0.5 + " hours of work");
            lazyCount = 0;
          } else {
            console.log("No change");
            lazyCount++;
            if(lazyCount * queryInterval > dayLength){
              myChannel.send("<@192841484939165696> GET BACK TO WORK ITS BEEN A DAY");
              lazyCount = 0;
            }
          }
        }

      });
    });
}

function checkColumns(command, requestedDate){  
    doc.getInfo((err, info) =>{
      sheet = info.worksheets[0];
      sheet.getCells({
      }, function( err, cells ){

        var dates = cells.filter(cell => {
          return cell.row === 1;
        });

        var times = cells.filter(cell => {
          return cell.col === 1;
        });

        var logLines= "";
        dates.forEach(date => {
          var blocks = cells.filter(cell => cell.col === date.col && cell.row > 1);
          var dateFields = date.value.split('-');
          date = new Date('20'+dateFields[0], dateFields[1]-1, dateFields[2]);

          var workBlocks = blocks.filter(block => block.value.indexOf('work-') !== -1);

          if(command === 'log'){
            logLines += ("On "+date.toDateString() + " Tej logged " + workBlocks.length*0.5 + " hours of work\n");
          } else if (command === 'day') {
            if(requestedDate.toDateString() === (date.toDateString())){
              myChannel.send("`Today Tej has logged "+ workBlocks.length*0.5 + " hours of work`");
            }
          }
        });

        if(command === 'log'){
          myChannel.send("```" + logLines + "```")
        }
      });
    });
}

client.login('MzM4NTUxMTE0MjU1MzAyNjU3.DFXD3w.nhNIU9V_9VXUNjAxwL41evuJ5cw');