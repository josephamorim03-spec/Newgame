// Copia o motor (function Engine) do protótipo para ano_no_vale_motor.js. Uso: node extrair_motor.js
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../prototipo/afluente.html'),'utf8');
const a=html.indexOf('function Engine(){'),b=html.indexOf('/* =====',a);
fs.writeFileSync(path.join(__dirname,'ano_no_vale_motor.js'),html.slice(a,b).trimEnd()+'\n');
console.log('motor extraído:',b-a,'caracteres');
