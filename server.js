// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer config (untuk upload gambar produk)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// File JSON
const productsFile = path.join(__dirname, 'data', 'products.json');
const ordersFile = path.join(__dirname, 'data', 'orders.json');

// Fungsi baca/tulis JSON
function readJSON(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ============================
   Endpoint Pembeli
   ============================ */

// Ambil daftar produk
app.get('/api/products', (req, res) => {
  const products = readJSON(productsFile);
  res.json(products);
});

// Checkout pesanan (pre-order jika stok 0)
app.post('/api/checkout', (req, res) => {
  const { buyerName, deviceId, items } = req.body;
  let orders = readJSON(ordersFile);
  let products = readJSON(productsFile);

  // Validasi stok
  for (let item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: 'Produk tidak ditemukan: ' + item.productId });
    }
    if (!item.preOrder && product.stock < item.quantity) {
      return res.status(400).json({ error: `Stok tidak cukup untuk: ${product.name}` });
    }
  }

  // Kurangi stok (untuk item non pre-order)
  for (let item of items) {
    const idx = products.findIndex(p => p.id === item.productId);
    if (!item.preOrder) {
      products[idx].stock -= item.quantity;
    }
  }
  writeJSON(productsFile, products);

  // Buat pesanan
  const order = {
    id: Date.now(),
    buyerName,
    deviceId,
    items,
    orderTime: Date.now(),
    status: 'pending'
  };
  orders.push(order);
  writeJSON(ordersFile, orders);

  res.json({ message: 'Pesanan berhasil dibuat', order });
});

// Batalkan pesanan (max 4 menit & status pending)
app.post('/api/cancel-order', (req, res) => {
  const { orderId, deviceId } = req.body;
  let orders = readJSON(ordersFile);
  const idx = orders.findIndex(o => o.id == orderId && o.deviceId === deviceId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }
  const order = orders[idx];
  const now = Date.now();
  if (now - order.orderTime > 240000 || order.status !== 'pending') {
    return res.status(400).json({ error: 'Pesanan tidak dapat dibatalkan' });
  }

  // Kembalikan stok (non pre-order)
  let products = readJSON(productsFile);
  for (let item of order.items) {
    if (!item.preOrder) {
      const pIdx = products.findIndex(p => p.id === item.productId);
      if (pIdx !== -1) {
        products[pIdx].stock += item.quantity;
      }
    }
  }
  writeJSON(productsFile, products);

  orders.splice(idx, 1);
  writeJSON(ordersFile, orders);
  res.json({ message: 'Pesanan dibatalkan' });
});

// Cek status pesanan milik deviceId
app.get('/api/my-orders', (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.json([]);
  let orders = readJSON(ordersFile);
  const myOrders = orders.filter(o => o.deviceId === deviceId);
  res.json(myOrders);
});

/* ============================
   Endpoint Penjual
   ============================ */

// Login penjual
app.post('/api/seller/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'jawaitalia123' && password === '88888') {
    return res.json({ message: 'Login berhasil' });
  }
  res.status(401).json({ error: 'Username atau password salah' });
});

// Menu Produk
app.get('/api/seller/products', (req, res) => {
  const products = readJSON(productsFile);
  res.json(products);
});

// Tambah produk (upload gambar)
app.post('/api/seller/products', upload.single('image'), (req, res) => {
  let products = readJSON(productsFile);
  const { name, price, description, ingredients, stock } = req.body;
  const newProduct = {
    id: Date.now(),
    name,
    price: Number(price),
    description,
    ingredients,
    stock: Number(stock),
    image: req.file ? '/uploads/' + req.file.filename : '/uploads/default.jpg'
  };
  products.push(newProduct);
  writeJSON(productsFile, products);
  res.json({ message: 'Produk berhasil ditambahkan', product: newProduct });
});

// Edit produk
app.put('/api/seller/products/:id', upload.single('image'), (req, res) => {
  let products = readJSON(productsFile);
  const productId = parseInt(req.params.id);
  const idx = products.findIndex(p => p.id === productId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Produk tidak ditemukan' });
  }
  let updated = products[idx];
  updated.name = req.body.name || updated.name;
  updated.price = req.body.price ? Number(req.body.price) : updated.price;
  updated.description = req.body.description || updated.description;
  updated.ingredients = req.body.ingredients || updated.ingredients;
  updated.stock = req.body.stock ? Number(req.body.stock) : updated.stock;
  if (req.file) {
    updated.image = '/uploads/' + req.file.filename;
  }
  products[idx] = updated;
  writeJSON(productsFile, products);
  res.json({ message: 'Produk diperbarui', product: updated });
});

// Hapus produk
app.delete('/api/seller/products/:id', (req, res) => {
  let products = readJSON(productsFile);
  const productId = parseInt(req.params.id);
  const i = products.findIndex(p => p.id === productId);
  if (i === -1) {
    return res.status(404).json({ error: 'Produk tidak ditemukan' });
  }
  products.splice(i, 1);
  writeJSON(productsFile, products);
  res.json({ message: 'Produk dihapus' });
});

// Menu Pesanan
app.get('/api/seller/orders', (req, res) => {
  const orders = readJSON(ordersFile);
  res.json(orders);
});

// Ubah status pesanan
app.post('/api/seller/orders/:id/status', (req, res) => {
  const orderId = parseInt(req.params.id);
  const { status } = req.body;
  let orders = readJSON(ordersFile);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }
  orders[idx].status = status;
  writeJSON(ordersFile, orders);

  // Jika ditolak, kembalikan stok (non pre-order)
  if (status === 'rejected') {
    let products = readJSON(productsFile);
    for (let item of orders[idx].items) {
      if (!item.preOrder) {
        const pIdx = products.findIndex(p => p.id === item.productId);
        if (pIdx !== -1) {
          products[pIdx].stock += item.quantity;
        }
      }
    }
    writeJSON(productsFile, products);
  }
  res.json({ message: `Status pesanan diupdate menjadi ${status}`, order: orders[idx] });
});

// Menu Penghasilan
app.get('/api/seller/income', (req, res) => {
  const orders = readJSON(ordersFile);
  const products = readJSON(productsFile);
  let incomeData = {};

  // Pesanan status 'ready' dianggap terjual
  orders.forEach(order => {
    if (order.status === 'ready') {
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          if (!incomeData[prod.name]) {
            incomeData[prod.name] = { sold: 0, income: 0, price: prod.price };
          }
          incomeData[prod.name].sold += item.quantity;
          incomeData[prod.name].income += (item.quantity * prod.price);
        }
      });
    }
  });

  let totalIncome = Object.values(incomeData).reduce((sum, val) => sum + val.income, 0);
  res.json({ incomeData, totalIncome });
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});