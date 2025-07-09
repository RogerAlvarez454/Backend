const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

async function generarPDF({ factura, cliente, detalles, formasPago }) {
  const html = await ejs.renderFile(path.join(__dirname, 'plantillaFactura.ejs'), {
    factura,
    cliente,
    detalles,
    formasPago
  });

  const browser = await puppeteer.launch({
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
