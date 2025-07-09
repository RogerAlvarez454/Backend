const builder = require('xmlbuilder');

function generarXML({ factura, productos, formas_pago, cliente }) {
  const xml = builder.create('factura', { encoding: 'UTF-8' })
    .att('id', 'comprobante')
    .att('version', '1.1.0');

  // === infoTributaria ===
  xml.ele('infoTributaria')
    .ele('ambiente', factura.ambiente).up()
    .ele('tipoEmision', '1').up()
    .ele('razonSocial', 'TECNO GLOBAL').up()
    .ele('nombreComercial', 'TECNO GLOBAL').up()
    .ele('ruc', '0502856966001').up()
    .ele('claveAcceso', factura.clave_acceso).up()
    .ele('codDoc', '01').up()
    .ele('estab', '001').up()
    .ele('ptoEmi', '001').up()
    .ele('secuencial', factura.numero_secuencial).up()
    .ele('dirMatriz', 'Ambato, Ecuador').up();

  // === infoFactura ===
  xml.ele('infoFactura')
    .ele('fechaEmision', new Date().toLocaleDateString('es-EC')).up()
    .ele('dirEstablecimiento', 'Ambato, Ecuador').up()
    .ele('obligadoContabilidad', 'SI').up()
    .ele('tipoIdentificacionComprador', cliente.ruc_cedula.length === 10 ? '05' : '04').up()
    .ele('razonSocialComprador', cliente.nombre).up()
    .ele('identificacionComprador', cliente.ruc_cedula).up()
    .ele('totalSinImpuestos', (factura.subtotal_0 + factura.subtotal_12).toFixed(2)).up()
    .ele('totalDescuento', factura.descuento.toFixed(2)).up()

    // === totalConImpuestos ===
    .ele('totalConImpuestos')
      .ele('totalImpuesto')
        .ele('codigo', '2').up()
        .ele('codigoPorcentaje', '2').up()
        .ele('baseImponible', factura.subtotal_12.toFixed(2)).up()
        .ele('valor', factura.iva_12.toFixed(2)).up()
      .up()
    .up()
    .ele('propina', '0.00').up()
    .ele('importeTotal', factura.total.toFixed(2)).up()
    .ele('moneda', 'DOLAR').up();

  // === pagos ===
  const pagos = xml.ele('pagos');
  formas_pago.forEach(pago => {
    pagos.ele('pago')
      .ele('formaPago', getCodigoFormaPago(pago.tipo)).up()
      .ele('total', pago.valor.toFixed(2)).up()
      .ele('plazo', '0').up()
      .ele('unidadTiempo', 'dias').up()
      .up();
  });

  // === detalles ===
  const detalles = xml.ele('detalles');
  productos.forEach(p => {
    const subtotal = (p.precio_unitario * p.cantidad) - (p.descuento || 0);
    const totalIVA = p.tiene_iva ? subtotal * 0.12 : 0;

    const detalle = detalles.ele('detalle');
    detalle.ele('codigoPrincipal', p.codigo || 'SIN-CODIGO').up();
    detalle.ele('descripcion', p.descripcion).up();
    detalle.ele('cantidad', p.cantidad.toFixed(2)).up();
    detalle.ele('precioUnitario', p.precio_unitario.toFixed(2)).up();
    detalle.ele('descuento', (p.descuento || 0).toFixed(2)).up();
    detalle.ele('precioTotalSinImpuesto', subtotal.toFixed(2)).up();

    // impuestos por ítem
    const impuestos = detalle.ele('impuestos');
    const impuesto = impuestos.ele('impuesto');
    impuesto.ele('codigo', '2').up();
    impuesto.ele('codigoPorcentaje', p.tiene_iva ? '2' : '0').up();
    impuesto.ele('tarifa', p.tiene_iva ? '12.00' : '0.00').up();
    impuesto.ele('baseImponible', subtotal.toFixed(2)).up();
    impuesto.ele('valor', totalIVA.toFixed(2)).up();
  });

  // === infoAdicional ===
  const infoAdicional = xml.ele('infoAdicional');
  if (factura.info_adicional) {
    infoAdicional.ele('campoAdicional', { nombre: 'Observaciones' }, factura.info_adicional);
  }

  return xml.end({ pretty: true });
}

// Función auxiliar para codificar forma de pago según SRI
function getCodigoFormaPago(tipo) {
  switch (tipo.toLowerCase()) {
    case 'efectivo': return '01';
    case 'tarjeta': return '19';
    case 'transferencia': return '20';
    default: return '01'; // por defecto efectivo
  }
}

module.exports = { generarXML };
