const supabase = require('../services/supabaseClient');
const { generarClaveAcceso } = require('../utils/claveAcceso');
const { generarXML } = require('../utils/generarXML');
const { generarPDF } = require('../utils/generarPDF');

async function obtenerFacturaPDF(req, res) {
  const { id } = req.params;

  try {
    const { data: factura } = await supabase.from('facturas').select('*').eq('id', id).single();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', factura.cliente_id).single();
    const { data: detalles } = await supabase.from('detalles_factura').select('*').eq('factura_id', id);
    const { data: formasPago } = await supabase.from('formas_pago').select('*').eq('factura_id', id);

    const pdfBuffer = await generarPDF({ factura, cliente, detalles, formasPago });

    const nombreArchivo = `${factura.clave_acceso}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('facturas-pdf')
      .upload(nombreArchivo, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error al subir PDF:', uploadError);
      return res.status(500).json({ error: 'No se pudo subir el PDF' });
    }

    const { data: publicUrlData } = supabase
      .storage
      .from('facturas-pdf')
      .getPublicUrl(nombreArchivo);

    return res.json({ url_pdf: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
}

async function emitirFactura(req, res) {
  try {
    const {
      ambiente,
      cliente_id,
      usuario_id,
      productos,
      info_adicional,
      formas_pago
    } = req.body;

    // === Obtener cliente ===
    const { data: cliente, error: errorCliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', cliente_id)
      .single();

    if (errorCliente) {
      return res.status(400).json({ error: 'Cliente no encontrado' });
    }

    // === Obtener último secuencial ordenado DESC ===
    const { data: ultFactura, error: errorUlt } = await supabase
      .from('facturas')
      .select('numero_secuencial')
      .order('numero_secuencial', { ascending: false })
      .limit(1)
      .single();

    let numeroSecuencial = 1;

    if (!errorUlt && ultFactura && ultFactura.numero_secuencial) {
      // parseInt para quitar ceros a la izquierda y sumar +1
      numeroSecuencial = parseInt(ultFactura.numero_secuencial, 10) + 1;
    }

    // Formatear con ceros a la izquierda (9 dígitos)
    const secuencial = numeroSecuencial.toString().padStart(9, '0');

    // === Generar clave de acceso ===
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tipoComprobante = '01';
    const ruc = '0502856966001';
    const serie = '001001';
    const codigoNumerico = '12345678';
    const tipoEmision = '1';

    const clave_acceso = generarClaveAcceso(
      fecha,
      tipoComprobante,
      ruc,
      ambiente,
      serie,
      secuencial,
      codigoNumerico,
      tipoEmision
    );

    // === Validar productos ===
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Productos no enviados o formato incorrecto' });
    }

    // === Cálculos ===
    let subtotal_12 = 0,
      subtotal_0 = 0,
      descuento = 0,
      iva_12 = 0,
      total = 0;

    productos.forEach(p => {
      const subtotalProducto = p.precio_unitario * p.cantidad;
      if (p.iva_porcentaje && p.iva_porcentaje > 0) {
        subtotal_12 += subtotalProducto;
        iva_12 += subtotalProducto * (p.iva_porcentaje / 100);
      } else {
        subtotal_0 += subtotalProducto;
      }
      descuento += p.descuento || 0;
    });

    total = subtotal_12 + subtotal_0 + iva_12 - descuento;

    // === Insertar factura con secuencial formateado ===
    const { data: factura, error: errorFactura } = await supabase
      .from('facturas')
      .insert([{
        numero_secuencial: secuencial,  // GUARDA CON CEROS
        ambiente,
        clave_acceso,
        cliente_id,
        usuario_id,
        subtotal_12,
        subtotal_0,
        descuento,
        iva_12,
        total,
        info_adicional
      }])
      .select()
      .single();

    if (errorFactura) {
      return res.status(400).json({ error: errorFactura.message });
    }

    // === Insertar detalles y actualizar stock ===
    for (const p of productos) {
      await supabase.from('detalles_factura').insert([{
        factura_id: factura.id,
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
        descuento: p.descuento || 0,
        total: (p.precio_unitario * p.cantidad) - (p.descuento || 0)
      }]);

      await supabase
        .from('productos')
        .update({ stock: p.stock - p.cantidad })
        .eq('id', p.id);
    }

    // === Insertar formas de pago ===
    for (const f of formas_pago) {
      await supabase.from('formas_pago').insert([{
        factura_id: factura.id,
        tipo: f.tipo,
        valor: f.valor
      }]);
    }

    // === Generar XML ===
    const xml = generarXML({ factura, productos, formas_pago, cliente });

    // === Subir XML ===
    const archivoNombre = `${clave_acceso}.xml`;
    const bufferXML = Buffer.from(xml, 'utf-8');

    const { error: errorStorage } = await supabase.storage
      .from('facturas-xml')
      .upload(archivoNombre, bufferXML, {
        contentType: 'application/xml',
        upsert: true
      });

    if (errorStorage) {
      return res.status(500).json({ error: 'Error al subir XML: ' + errorStorage.message });
    }

    const { data: publicData, error: errorURL } = supabase.storage
      .from('facturas-xml')
      .getPublicUrl(archivoNombre);

    if (errorURL) {
      return res.status(500).json({ error: 'Error al obtener URL pública' });
    }

    const publicURL = publicData.publicUrl;

    // === Guardar URL XML ===
    const { error: updateError } = await supabase
      .from('facturas')
      .update({ url_xml: publicURL })
      .eq('id', factura.id);

    if (updateError) {
      return res.status(500).json({ error: 'Error al guardar URL del XML en la base de datos' });
    }

    // === Generar PDF ===
    const pdfBuffer = await generarPDF({ factura, cliente, detalles: productos, formasPago: formas_pago });

    // === Subir PDF ===
    const archivoNombrePDF = `${clave_acceso}.pdf`;

    const { error: errorStoragePDF } = await supabase.storage
      .from('facturas-pdf')
      .upload(archivoNombrePDF, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (errorStoragePDF) {
      return res.status(500).json({ error: 'Error al subir PDF: ' + errorStoragePDF.message });
    }

    const { data: publicDataPDF, error: errorURLPDF } = supabase.storage
      .from('facturas-pdf')
      .getPublicUrl(archivoNombrePDF);

    if (errorURLPDF) {
      return res.status(500).json({ error: 'Error al obtener URL pública del PDF' });
    }

    const publicURLPDF = publicDataPDF.publicUrl;

    // === Guardar URL PDF ===
    const { error: updatePDFError } = await supabase
      .from('facturas')
      .update({ url_pdf: publicURLPDF })
      .eq('id', factura.id);

    if (updatePDFError) {
      return res.status(500).json({ error: 'Error al guardar URL del PDF en la base de datos' });
    }

    return res.status(201).json({
      factura_id: factura.id,
      secuencial,
      url_xml: publicURL,
      url_pdf: publicURLPDF
    });
  } catch (error) {
    console.error('Error emitir factura:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Obtener factura con detalles y formas de pago
async function obtenerFactura(req, res) {
  const { id } = req.params;

  try {
    const { data: factura, error: errorFactura } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', id)
      .single();

    if (errorFactura || !factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const { data: cliente, error: errorCliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', factura.cliente_id)
      .single();

    if (errorCliente || !cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const { data: detalles, error: errorDetalles } = await supabase
      .from('detalles_factura')
      .select('id, cantidad, precio_unitario, descuento, producto_id')
      .eq('factura_id', id);

    if (errorDetalles) {
      console.error("❌ Error al obtener detalles de factura:", errorDetalles);
      return res.status(500).json({ error: 'Error obteniendo detalles de factura' });
    }

    const productoIds = detalles
      .map(d => d.producto_id)
      .filter(id => id !== null && id !== undefined);

    if (productoIds.length === 0) {
      return res.status(404).json({ error: 'No hay productos relacionados a esta factura' });
    }

    const { data: productos, error: errorProductos } = await supabase
      .from('productos')
      .select('id, descripcion, iva_porcentaje')
      .in('id', productoIds);

    if (errorProductos) {
      console.error("❌ Error al obtener productos:", errorProductos);
      return res.status(500).json({ error: 'Error obteniendo productos' });
    }

    const detallesMapeados = detalles.map(d => {
      const producto = productos.find(p => p.id === d.producto_id);
      return {
        id: d.id,
        producto_nombre: producto?.descripcion || 'N/D',
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        descuento: d.descuento,
        iva_porcentaje: producto?.iva_porcentaje || 0
      };
    });

    const { data: formasPago, error: errorFormas } = await supabase
      .from('formas_pago')
      .select('*')
      .eq('factura_id', id);

    if (errorFormas) {
      return res.status(500).json({ error: 'Error obteniendo formas de pago' });
    }

    return res.json({
      factura: {
        ...factura,
        secuencial: factura.numero_secuencial
      },
      cliente,
      detalles: detallesMapeados,
      formasPago
    });
  } catch (error) {
    console.error('Error interno:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function obtenerFacturas(req, res) {
  try {
    const { data, error } = await supabase
      .from('facturas')
      .select('*, cliente:clientes(nombre)')
      .order('fecha_emision', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function obtenerFacturaUR(req, res) {
  const { id } = req.params;

  const { data: factura, error } = await supabase
    .from('facturas')
    .select('id, clave_acceso, url_xml')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({ error: 'Factura no encontrada' });
  }

  return res.status(200).json(factura);
}

module.exports = {
  emitirFactura,
  obtenerFactura,
  obtenerFacturas,
  obtenerFacturaUR,
  obtenerFacturaPDF
};
