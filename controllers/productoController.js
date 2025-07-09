// === backend/controllers/productoController.js ===
const supabase = require('../services/supabaseClient');

// Obtener todos los productos
exports.obtenerProductos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('descripcion', { ascending: true })
      .limit(10);

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear un nuevo producto
exports.crearProducto = async (req, res) => {
  const { codigo, descripcion, precio_unitario, iva_porcentaje, stock } = req.body;

  if (!codigo || !descripcion || precio_unitario == null || stock == null) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const { data, error } = await supabase
      .from('productos')
      .insert([{ codigo, descripcion, precio_unitario, iva_porcentaje, stock }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar un producto existente
exports.actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { codigo, descripcion, precio_unitario, iva_porcentaje, stock } = req.body;

  try {
    const { data, error } = await supabase
      .from('productos')
      .update({ codigo, descripcion, precio_unitario, iva_porcentaje, stock })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar un producto
exports.eliminarProducto = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
