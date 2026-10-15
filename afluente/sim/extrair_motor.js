// Copia os motores puros do protótipo para o simulador. Uso: node extrair_motor.js
// - function Engine (regras) -> ano_no_vale_motor.js
// - function Atmos (clima, v2.0) -> atmos_motor.js
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../prototipo/afluente.html'),'utf8');
for(const[fn,file]of[['function Engine(){','ano_no_vale_motor.js'],['function Atmos(){','atmos_motor.js']]){
  const a=html.indexOf(fn),b=html.indexOf('/* =====',a);
  fs.writeFileSync(path.join(__dirname,file),html.slice(a,b).trimEnd()+'\n');
  console.log(file,'extraído:',b-a,'caracteres');}
