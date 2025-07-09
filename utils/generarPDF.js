const puppeteer = require('puppeteer');
const path = require('path');
const ejs = require('ejs');

async function generarPDF({ factura, cliente, detalles, formasPago }) {
  const html = await ejs.renderFile(path.join(__dirname, 'plantillaFactura.ejs'), {
    factura,
    cliente,
    detalles,
    formasPago
  });

  // Ruta explícita al Chromium instalado en Render
  const executablePath = '/usr/bin/chromium-browser';
  console.log('Ruta de Chromium:', executablePath);

  const browser = await puppeteer.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = { generarPDF };
