const Discord = require('discord.js');
const client = new Discord.Client();
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var token = require('./token');
var myChannel;

var queryInterval = 10 * 60 * 1000;
var dayLength = 86400 * 1000;
var doc = new GoogleSpreadsheet('1he6sw3OHMArnJlZ40vrNk0YSx8gLTzyBd-6DaMExoNc');
var sheet;
var lastCount = 0;
var count = 0;
var lazyCount = 0;
var database = new Map();

client.on('ready', () => {
  initLog();
  checkColumns();
  setInterval(checkLog, queryInterval);

  client.channels.forEach(channel => {
    // test 338550421251555338
    // thuglife 207234209339801601
    if (channel.id === '207234209339801601') {
      myChannel = channel;
    }

  });
});

client.on('message', function (message) {
  if (message.channel.id === myChannel.id) {
    var text = message.content.toLocaleLowerCase();
    if (text.indexOf('feature') !== -1 && text.indexOf('request') !== -1) {
      myChannel.send("Fuck you");
    }
    else if (text.startsWith('#today')) {
      checkColumns('day', new Date());
    }
    else if (text.startsWith('#yesterday')) {
      checkColumns('day', yesterday());
    }
    else if (text.startsWith('#doc')) {
      myChannel.send("https://docs.google.com/spreadsheets/d/1he6sw3OHMArnJlZ40vrNk0YSx8gLTzyBd-6DaMExoNc");
    }
    else if (text.startsWith("#log")) {
      checkColumns('log');
    }
    else if (text.startsWith("#commands")) {
      myChannel.send("```"
        + "Available Commands" + "\n"
        + "#today" + "\n"
        + "#yesterday" + "\n"
        + "#doc" + "\n"
        + "#log" + "\n"
        + "```");
    }
  }

});

function initLog() {
  checkLog(true)
}

function checkLog(initializing) {
  doc.getInfo((err, info) => {
    sheet = info.worksheets[0];
    sheet.getCells({
    }, function (err, cells) {
      lastCount = count;
      count = 0;
      cells.forEach(function (cell) {
        if (cell.value.indexOf('work-') !== -1) {
          count++;
        }
      }, this);
      if (initializing) {
        console.log("Initialized with " + (count) * 0.5 + " hours of work.")
        // myChannel.send("I'm watching you <@192841484939165696>");
        // myChannel.send("Initialized with " + (count)*0.5 + " hours of work.");
      } else {
        if (count > lastCount) {
          console.log("Tej logged " + (count - lastCount) * 0.5 + " new hours of work");
          myChannel.send("Tej logged " + (count - lastCount) * 0.5 + " new hours of work");
          lazyCount = 0;
        } else if (count < lastCount) {
          console.log("Tej removed " + (count - lastCount) * 0.5 + " hours of work");
          myChannel.send("Tej removed " + (lastCount - count) * 0.5 + " hours of work");
          lazyCount = 0;
        } else {
          console.log("No change");
          lazyCount++;
          if (lazyCount * queryInterval > dayLength) {
            myChannel.send("<@192841484939165696> GET BACK TO WORK ITS BEEN A DAY");
            lazyCount = 0;
          }
        }
      }

    });
  });
}

function checkColumns(command, requestedDate, dateString) {
  doc.getInfo((err, info) => {
    sheet = info.worksheets[0];
    sheet.getCells({
    }, function (err, cells) {

      var dates = cells.filter(cell => {
        return cell.row === 1;
      });

      var times = cells.filter(cell => {
        return cell.col === 1;
      });

      var logLines = "";
      dates.forEach(date => {
        var blocks = cells.filter(cell => cell.col === date.col && cell.row > 1);
        var dateFields = date.value.split('-');
        date = new Date('20' + dateFields[0], dateFields[1] - 1, dateFields[2]);

        var workBlocks = blocks.filter(block => block.value.indexOf('work-') !== -1);

        database.set(date.toDateString(), {
          date,
          workBlocks
        });
      });

      if (command === 'log') {
        database.forEach((value, key) => {
          logLines += ("On " + key + " Tej logged " + value.workBlocks.length * 0.5 + " hours of work\n");
        });

        myChannel.send("```" + logLines + "```");
      } else if (command === 'day') {
        //Requested Day
        var foundDate = database.get(requestedDate.toDateString());
        if (foundDate) {
          //Today
          if (requestedDate.toDateString() === (new Date()).toDateString()) {
            printWorkCategories(foundDate.workBlocks, "Today Tej has logged " + foundDate.workBlocks.length * 0.5 + " hours of work");
          }
          //Yesterday
          else if (requestedDate.toDateString() === (yesterday()).toDateString()) {
            printWorkCategories(foundDate.workBlocks, "Yesterday Tej logged " + foundDate.workBlocks.length * 0.5 + " hours of work");
          }
        }
      }
    });
  });
}

function yesterday() {
  var date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

function printWorkCategories(workBlocks, headerLine) {
  var tempMap = new Map();
  workBlocks.forEach(block => {
    var category = tempMap.get(block.value);
    if (!category) {
      category = {
        count: 0
      }
    }
    category.count++;
    tempMap.set(block.value, category);
  });

  var printLines = "";
  tempMap.forEach((value, key) => {
    printLines += value.count * 0.5 + " hours on " + key.slice("work- ".length);
  });

  if(headerLine){
    myChannel.send("```" + headerLine + "\n" + printLines + "```");
  } else {
    myChannel.send("```" + printLines + "```");
  }
}

client.login(token.token);