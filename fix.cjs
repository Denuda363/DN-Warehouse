const fs = require('fs');
const lines = fs.readFileSync('src/pages/MasterData.tsx', 'utf8').split('\n');
const fixed = [];
let next_line = "";

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line === "<Button size=\"sm\"" && lines[i+1] && lines[i+1].includes('className="bg-indigo-600 hover:bg-indigo-700 text-white"')) {
      fixed.push("<Button");
      fixed.push(lines[i+1]);
      next_line = lines[i+1];
      i++; // skip next line because we consumed it
      continue;
  }
  
  fixed.push(line);
  if (line.includes("<Button")) {
      // it means the original awk script did getline next_line
      next_line = lines[i+1];
      fixed.push(next_line); // this is 'b'
      i++; // skip 'b' in the input because we consumed it
  } else {
      // the original awk script printed next_line after this line
      if (next_line && lines[i+1] === next_line) {
          i++; // skip the duplicated next_line
      }
  }
}

fs.writeFileSync('src/pages/MasterData.tsx', fixed.join('\n'));
console.log("Fixed lines:", fixed.length);
