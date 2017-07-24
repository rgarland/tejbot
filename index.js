const Discord = require('discord.js');
const client = new Discord.Client();
var GoogleSpreadsheet = require('google-spreadsheet');
var dateFormat = require('dateformat');
var async = require('async');
var token = require('./token');
var myChannel;

var queryInterval = 10 * 60 * 1000;
var dayLength = 86400 * 1000;
var doc = new GoogleSpreadsheet('1he6sw3OHMArnJlZ40vrNk0YSx8gLTzyBd-6DaMExoNc');
var sheet;
var database = new Map();
var today = {};
var lastDatabase = new Map();

// tag Tej <@192841484939165696> 

client.on('ready', () => {
  initDatabase();
  setInterval(watcher, queryInterval);

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
      myChannel.send("https://github.com/rgarland/tejbot/pulls");
    }
    else if (text.startsWith('!today') || text.startsWith("!day 1")) {
      responder('day', new Date());
    }
    else if (text.startsWith('!yesterday')) {
      responder('day', yesterday());
    }
    else if (text.startsWith("!day")) {
      try {
        var selector = text.split(" ")[1];
        responder('day', yesterday(selector - 1));
      }
      catch (ex) {
        myChannel.send("Invalid day");
      }
    }
    else if (text.startsWith('!doc')) {
      myChannel.send("https://docs.google.com/spreadsheets/d/1he6sw3OHMArnJlZ40vrNk0YSx8gLTzyBd-6DaMExoNc");
    }
    else if (text.startsWith("!log")) {
      responder('log');
    }
    else if (text.startsWith("!github")) {
      myChannel.send("https://github.com/rgarland/tejbot");
    }
    else if (text.startsWith("!commands")) {
      myChannel.send("```"
        + "Available Commands" + "\n"
        + "!today" + "\n"
        + "!yesterday" + "\n"
        + "!day {index from log}" + "\n"
        + "!doc" + "\n"
        + "!log" + "\n"
        + "```");
    }
  }

});

function initDatabase() {
  doc.getInfo((err, info) => {
    sheet = info.worksheets[0];
    sheet.getCells({
    }, function (err, cells) {
      updateDatabase(cells);
    })
  })
}
function watcher(initializing) {
  doc.getInfo((err, info) => {
    sheet = info.worksheets[0];
    sheet.getCells({
    }, function (err, cells) {
      updateDatabase(cells);
      detectChanges();
    });
  });
}

function responder(command, requestedDate, dateString) {
  doc.getInfo((err, info) => {
    sheet = info.worksheets[0];
    sheet.getCells({
    }, function (err, cells) {
      updateDatabase(cells);

      if (command === 'log') {
        var logLines = "";
        database.forEach((value, key) => {
          if (value.date < new Date() && value.date > yesterday(7)) {
            logLines = daysBetween(value.date, new Date()) + ". " + (printDate(value.date) + " - " + getHours(value.workBlocks.length) + "\n") + logLines;
          }
        });

        myChannel.send("```Log Response:\n" + logLines + "```");
      } else if (command === 'day') {
        //Requested Day
        var foundDate = database.get(requestedDate.toDateString());
        if (foundDate) {
          //Today
          if (requestedDate.toDateString() === (new Date()).toDateString()) {
            printWorkCategories(foundDate.workBlocks, "Today Tej has logged " + getHours(foundDate.workBlocks.length, true));
          }
          //Yesterday
          else if (requestedDate.toDateString() === (yesterday()).toDateString()) {
            printWorkCategories(foundDate.workBlocks, "Yesterday Tej logged " + getHours(foundDate.workBlocks.length, true));
          }
          else {
            printWorkCategories(foundDate.workBlocks, printDate(foundDate.date) + " Tej logged " + getHours(foundDate.workBlocks.length, true));
          }
        }
      }

      detectChanges();
    });
  });
}

function yesterday(offset) {
  if (!offset) {
    offset = 1;
  }
  var date = new Date();
  date.setDate(date.getDate() - offset);
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
    printLines += getHours(value.count) + " on " + key.slice("work- ".length) + "\n";
  });

  if (headerLine) {
    if (printLines) {
      myChannel.send("```" + headerLine + " \n" + printLines + "```");
    } else {
      myChannel.send("```" + headerLine + " \n" + "Nothing!```");
    }
  } else {
    if (printLines) {
      myChannel.send("```" + printLines + "```");
    } else {
      myChannel.send("```Nothing!```");
    }
  }
}

function updateDatabase(cells) {
  lastDatabase = new Map(database);
  var dates = cells.filter(cell => {
    return cell.row === 1;
  });

  var times = cells.filter(cell => {
    return cell.col === 1;
  });

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
}

function detectChanges() {
  database.forEach((value, key) => {
    var old = lastDatabase.get(key);
    if (old) {
      if (old.workBlocks.length != value.workBlocks.length) {
        myChannel.send("Tej modified log for day: " + key);
        printWorkCategories(old.workBlocks, "Previously");
        printWorkCategories(value.workBlocks, "Now");
      }
    }
  })
}

function printDate(date) {
  return dateFormat(date, "ddd mmm dd")
}

function getHours(number, noPadding) {
  var text = (number * 0.5);
  return noPadding ? text + " hr" : ("    " + text).slice(-4) + " hr";
}

function daysBetween(first, second) {
  console.log(first)
  console.log(second);
  console.log("`````````````````````````````")
  return Math.ceil((second - first) / (1000 * 60 * 60 * 24));
}

client.login(token.token);