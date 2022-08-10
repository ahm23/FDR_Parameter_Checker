import fs from 'fs';
import { parse } from 'csv-parse';

const records = [];
// Initialize the parser
const parser = parse({
  delimiter: ','
});
// Use the readable stream api to consume records
parser.on('readable', function(){
  let record;
  while ((record = parser.read()) !== null) {
    records.push(record);
  }
});
// database sent to inc..
// Catch any error
parser.on('error', function(err){
  console.error(err.message);
});
// Test that the parsed records matched the expected records
parser.on('end', function(){
  //console.log(records);
  console.log(records.length)
  run(genFDRObject(records))
  //genFDRObject(records)

});
// Close the readable stream

parser.write(fs.readFileSync("./CSV/FDRParameters.csv", `utf8`));
parser.end();

let duplicates = [];

function genFDRObject(data) {
  let FDRParameters = {};
  data.forEach(el => {
    if (!FDRParameters[el[0]]) {
      FDRParameters[el[0]] = el.slice(1);
    } else {
      console.log("DUPLICATE NAME: ", el[0]);
      duplicates.push(el[0]);
    }
  });
  console.log('\n\n')
  return FDRParameters;
}

function run(FDRParameters) {
  const ROSEDB = fs.readFileSync('./CSV/aug10', 'utf-8');
  var parseNext = 0;
  var parseName = '';
  ROSEDB.split(/\r?\n/).forEach(line => {
    if (line == '"Parameters Table"') {
      parseNext++;
    } else if (parseNext) {
      switch (parseNext) {
        case 1:
          let head = line.split(',');
          parseName = head[2].replaceAll('"', '');
          if (!FDRParameters[parseName]) {
            if (head[3] == "recorded")
              console.log("ROSE PARAMETER NOT IN CSV: ", parseName);
            parseNext = 0;
          } else if (duplicates.includes(parseName))
            parseNext = 0;
          else
            parseNext++;
          break;
        case 2:
          if (line == '"Recorded Table"')
            parseNext++;
          break;
        case 3:
          let data = line.split(',');
          if (FDRParameters[parseName][0] !== data[2])
            console.log("\nINCORRECT WORD DATA  | ", parseName, "\nMESSAGE: Desired '"+ FDRParameters[parseName][0] +"' not equal to '" + data[2] + "'");
          if (!checkbox(FDRParameters[parseName][1], data[3]))
            console.log("\nINCORRECT CHECKBOXES | ", parseName, "\nMESSAGE: Desired '"+ FDRParameters[parseName][1] +"' not equal to '" + checkboxReverse(parseInt(data[3])) + "'");
          if (parseInt(rangeToBinary(FDRParameters[parseName][2]),2) !== parseInt(data[4]))
            console.log("\nINCORRECT BITS       | ", parseName, "\nMESSAGE:  Desired '"+ rangeToBinary(FDRParameters[parseName][2]) +"' not equal to '" + numToBinary(data[4]) + "'");
          parseNext = 0;
          break;
        default:
          parseNext = 0;
          break;
      }
    }
  });
}

function checkbox(val, db_val) {
  const sep = val.split(',');
  let sum = 0;
  sep.forEach(v => {
    if (v == 3) sum+=4;
    else if (v == 4) sum+=8;
    else sum+=parseInt(v);
  });
  return sum == db_val;
}

function checkboxReverse(val) {
  switch (val) {
    case 15:
      return '1,2,3,4'
    case 12:
      return '3,4'
    case 10:
      return '2,4'
    case 9:
      return '1,4'
    case 8:
      return '4'
    case 6:
      return '2,3'
    case 5:
      return '1,3'
    case 4:
      return '3'
    case 3:
      return '1,2'
    default:
      return val.toString();
  }
}


function rangeToBinary(range) {
  const seg = range.split("-");
  let binary = '';
  if (seg.length == 1) {
    for (var i = 12; i >= 1; i--) {
      if (i == seg[0]) binary += '1';
      else binary += '0';
    }
  } else if (seg.length == 2) {
    for (var i = 12; i >= 1; i--) {
      if (i >= seg[1] && i <= seg[0]) binary += '1';
      else binary += '0';
    }
  }
  return binary;
}

function numToBinary(num) {
  const stripped = Number(num).toString(2);
  let zeros = '';
  for (var i = stripped.length; i < 12; i++)
    zeros += '0';
  return zeros + stripped;
}