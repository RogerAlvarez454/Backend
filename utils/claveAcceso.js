function generarClaveAcceso(fecha, tipoComprobante, ruc, ambiente, serie, secuencial, codigoNumerico, tipoEmision) {
  const clave = `${fecha}${tipoComprobante}${ruc}${ambiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;
  const digitoVerificador = modulo11(clave);
  return clave + digitoVerificador;
}

function modulo11(cadena) {
  let baseMultiplicador = 7;
  let total = 0;
  let multiplicador = 2;

  for (let i = cadena.length - 1; i >= 0; i--) {
    total += parseInt(cadena[i]) * multiplicador;
    multiplicador = multiplicador === baseMultiplicador ? 2 : multiplicador + 1;
  }

  const residuo = total % 11;
  const resultado = residuo === 0 ? 0 : residuo === 1 ? 1 : 11 - residuo;
  return resultado;
}

module.exports = { generarClaveAcceso };
