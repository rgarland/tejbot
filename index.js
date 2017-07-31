const Discord = require('discord.js');
const client = new Discord.Client();
var GoogleSpreadsheet = require('google-spreadsheet');
var dateFormat = require('dateformat');
var async = require('async');
var token = require('./token');
var storage = require('node-persist');

var myChannel;

var queryInterval = 10 * 60 * 1000;
var dayLength = 86400 * 1000;
var doc = new GoogleSpreadsheet('1he6sw3OHMArnJlZ40vrNk0YSx8gLTzyBd-6DaMExoNc');
var sheet;
var database = new Map();
var today = {};
var lastDatabase = new Map();
var sentMessages = new Map();
var toLowerCounter = 0;

const tejId = '192841484939165696';// '192841484939165696';
const rogarId = '122070682149322752';

client.on('ready', () => {
  initDatabase();
  setInterval(watcher, queryInterval);
  storage.getItem('toLowerCounter', (err, value) => {
    toLowerCounter = value;
  });

  client.channels.forEach(channel => {
    // test 338550421251555338
    // thuglife 207234209339801601
    if (channel.id === '207234209339801601') {
      myChannel = channel;
    }

  });
});

storage.initSync();

client.on('message', function (message) {

  if (message.author.id === tejId) {
    if (check(message.content)) {
      message.delete();
      toLowerCounter++;
      reply(message, "`Tej.toLower() = ` " + message.content.toLowerCase());
      console.log("toLower Count: " + toLowerCounter + ", message: " + message.content);
      storage.setItem('toLowerCounter', toLowerCounter);
    }
  }

  if (message.channel.id === myChannel.id) {
    var text = message.content.toLocaleLowerCase();
    if (message.author.id === rogarId) {
      if (text.startsWith("!resetcount")) {
        toLowerCounter = 0;
        storage.setItem('toLowerCounter', toLowerCounter);
        send("Tej.toLower() count reset to: " + toLowerCounter);
      }
    }

    if (text.indexOf('feature') !== -1 && text.indexOf('request') !== -1) {
      send("https://github.com/rgarland/tejbot/pulls");
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
        send("Invalid day");
      }
    }
    else if (text.startsWith('!doc')) {
      send("https://docs.google.com/spreadsheets/d/1he6sw3OHMArnJlZ40vrNk0YSx8gLTzyBd-6DaMExoNc");
    }
    else if (text.startsWith("!log")) {
      responder('log');
    }
    else if (text.startsWith("!delete")) {
      try {
        var messageId = text.split(" ")[1];
        sentMessages.get(messageId).delete();
      }
      catch (ex) {
        send("Invalid messageId");
      }
    }
    else if (text.startsWith("!count")) {
      send("Tej.toLower() count = " + toLowerCounter);
    }
    else if (text.startsWith("!nickname")) {
      try {
        var name = message.content.slice(9, text.length).trim();
        if (name.toLowerCase().indexOf('tej') !== -1) {
          var oldName = message.guild.members.get(tejId).nickname;
          message.guild.members.get(tejId).setNickname(name);
          send("Change name from " + oldName + " to " + name);
        } else {
          send("Invalid name, must contain 'Tej'");
        }
      }
      catch (ex) {
        console.log(ex)
        send("Invalid name, must contain 'Tej'");
      }
    }
    else if (text.startsWith("!github")) {
      send("https://github.com/rgarland/tejbot");
    }
    else if (text.startsWith("!commands") || text.startsWith("!help")) {
      send("```"
        + "Available Commands" + "\n"
        + "!today" + "\n"
        + "!yesterday" + "\n"
        + "!day {index from log}" + "\n"
        + "!delete {messageId}" + "\n"
        + "!count" + "\n"
        + "!doc" + "\n"
        + "!log" + "\n"
        + "```");
    }
  }

});

function check(str) {
  var count = 0;
  var length = str.length;
  letterCount = 0;
  for (var i = 0; i < length; i++) {
    if (str[i].match(/[a-z]/i)) {
      letterCount++;
    }

    if (str[i].toUpperCase() === str[i] && str[i].match(/[a-z]/i)) {
      count++;
    }
  }

  return count / letterCount > 0.5;
}

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

        send("```Log Response:\n" + logLines + "```");
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
      send("```" + headerLine + " \n" + printLines + "```");
    } else {
      send("```" + headerLine + " \n" + "Nothing!```");
    }
  } else {
    if (printLines) {
      send("```" + printLines + "```");
    } else {
      send("```Nothing!```");
    }
  }
}

function printDiff(before, after) {
  var beforeMap = new Map();
  before.forEach(block => {
    var category = beforeMap.get(block.value);
    if (!category) {
      category = {
        count: 0
      }
    }
    category.count++;
    beforeMap.set(block.value, category);
  });

  var afterMap = new Map();
  after.forEach(block => {
    var category = afterMap.get(block.value);
    if (!category) {
      category = {
        count: 0
      }
    }
    category.count++;
    afterMap.set(block.value, category);
  });

  var printLines = "";
  afterMap.forEach((afterCategory, key) => {
    var beforeCategory = beforeMap.get(key);
    var beforeCount = beforeCategory ? beforeCategory.count : 0;
    var afterCount = afterCategory ? afterCategory.count : 0;
    if (beforeCount !== afterCount) {
      printLines += getHours(afterCount - beforeCount) + " on " + key.slice("work- ".length) + "\n";
    }
  });

  beforeMap.forEach((beforeCategory, key) => {
    var afterCategory = afterMap.get(key);
    var beforeCount = beforeCategory ? beforeCategory.count : 0;
    var afterCount = afterCategory ? afterCategory.count : 0;
    if (beforeCount !== afterCount) {
      printLines += getHours(afterCount - beforeCount) + " on " + key.slice("work- ".length) + "\n";
    }
  });

  if (printLines) {
    send("```" + printLines + "```");
  } else {
    send("```Nothing!```");
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
      // for testing
      // if (value.date.toDateString().indexOf('03') !== -1) {
      //   old.workBlocks.push({ value: 'work- negative' })
      //   old.workBlocks.push({ value: 'work- nagative' })
      //   value.workBlocks.push({ value: 'work- positive' })
      // }
      if (old.workBlocks.length != value.workBlocks.length) {
        send("Tej modified log for day: " + key);
        printDiff(old.workBlocks, value.workBlocks);
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
  return Math.ceil((second - first) / (1000 * 60 * 60 * 24));
}

function send(payload, dontSave) {
  myChannel.send(payload).then(message => {
    sentMessages.set(message.id, message);
  });
}

function reply(message, string) {
  message.channel.send(string);
}

client.login(token.token);