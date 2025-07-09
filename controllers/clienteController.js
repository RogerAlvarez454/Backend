const supabase = require('../services/supabaseClient');

exports.obtenerClientes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true })
      .limit(10);

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.crearCliente = async (req, res) => {
  const { nombre, ruc_cedula, direccion, telefono, correo } = req.body;
  if (!nombre || !ruc_cedula) {
    return res.status(400).json({ error: 'Nombre y RUC/Cédula son obligatorios' });
  }
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ nombre, ruc_cedula, direccion, telefono, correo }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, ruc_cedula, direccion, telefono, correo } = req.body;
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update({ nombre, ruc_cedula, direccion, telefono, correo })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (!data) return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.eliminarCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
