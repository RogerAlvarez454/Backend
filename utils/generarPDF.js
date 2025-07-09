const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const path = require('path');
const ejs = require('ejs');

async function generarPDF({ factura, cliente, detalles, formasPago }) {
  const html = await ejs.renderFile(path.join(__dirname, 'plantillaFactura.ejs'), {
    factura,
    cliente,
    detalles,
    formasPago
  });

  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath || '/usr/bin/chromium-browser',
    args: chromium.args,
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport,
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
