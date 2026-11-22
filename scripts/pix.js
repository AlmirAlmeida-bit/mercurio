// Gera o Pix de doação (padrão BR Code do Banco Central, valor livre):
//   assets/pix.png  -> QR code mostrado em apoiar.html
//   pix-dados.js    -> o mesmo código em texto, para o "Pix copia e cola"
// Rodar: npm run pix (depois de mudar a chave, o nome ou a cidade). A biblioteca qrcode só roda aqui, não vai no app.
const fs = require('node:fs');
const path = require('node:path');

const PIX = {
  chave: '1df34532-bb39-43e5-a935-cd187e4cf3be', // chave aleatória (não expõe CPF/telefone/e-mail)
  nome: 'ALMIR ALMEIDA',                          // como no banco; até 25 letras, sem acento
  cidade: 'RIO DE JANEIRO',                       // até 15 letras, sem acento
};

const campo = (id, valor) => id + String(valor.length).padStart(2, '0') + valor;
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code
function crc16(s) {
  let crc = 0xffff;
  for (const b of Buffer.from(s, 'utf8')) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function brCode({ chave, nome, cidade }) {
  const corpo = campo('00', '01')
    + campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', chave))
    + campo('52', '0000') + campo('53', '986') // sem campo 54: a pessoa escolhe o valor
    + campo('58', 'BR')
    + campo('59', semAcento(nome).slice(0, 25))
    + campo('60', semAcento(cidade).slice(0, 15))
    + campo('62', campo('05', '***'))
    + '6304';
  return corpo + crc16(corpo);
}

module.exports = { brCode, crc16 };

if (require.main === module) {
  const assert = require('node:assert');
  // exemplo do manual do BR Code (Banco Central)
  assert.strictEqual(crc16('00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304'), '1D3D');
  const codigo = brCode(PIX);
  const root = path.join(__dirname, '..');
  fs.writeFileSync(path.join(root, 'pix-dados.js'),
    `// Gerado por scripts/pix.js (npm run pix). Não editar à mão.\nconst PIX = ${JSON.stringify({ codigo, nome: PIX.nome, cidade: PIX.cidade })};\n`);
  require('qrcode').toFile(path.join(root, 'assets', 'pix.png'), codigo, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
    .then(() => console.log('pix ok:', codigo));
}
