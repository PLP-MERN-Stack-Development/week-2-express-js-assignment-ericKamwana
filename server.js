// server.js - Final complete version

const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// === Custom Error Classes ===
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

// === Middleware ===
app.use(bodyParser.json());

// Logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Auth middleware
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== '12345') {
    return res.status(401).json({ message: 'Unauthorized - Invalid API Key' });
  }
  next();
});

// Validation middleware
function validateProduct(req, res, next) {
  const { name, description, price, category, inStock } = req.body;
  if (!name || !description || price == null || !category || inStock == null) {
    throw new ValidationError('Missing required product fields');
  }
  next();
}

// === Sample Products Data ===
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1200,
    category: 'electronics',
    inStock: true
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model with 128GB storage',
    price: 800,
    category: 'electronics',
    inStock: true
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with timer',
    price: 50,
    category: 'kitchen',
    inStock: false
  }
];

// === Routes ===

app.get('/', (req, res) => {
  res.send('Welcome to the Product API! Go to /api/products to see all products.');
});

// GET /api/products - All products (with filter, search, pagination)
app.get('/api/products', (req, res) => {
  let result = [...products];

  // Search
  const search = req.query.search?.toLowerCase();
  if (search) {
    result = result.filter(
      p =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
    );
  }

  // Filter by category
  const category = req.query.category?.toLowerCase();
  if (category) {
    result = result.filter(p => p.category.toLowerCase() === category);
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || result.length;
  const start = (page - 1) * limit;
  const end = start + limit;

  const paginated = result.slice(start, end);

  res.json(paginated);
});

// GET /api/products/:id
app.get('/api/products/:id', (req, res, next) => {
  try {
    const product = products.find(p => p.id === req.params.id);
    if (!product) throw new NotFoundError('Product not found');
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
app.post('/api/products', validateProduct, (req, res, next) => {
  try {
    const newProduct = { id: uuidv4(), ...req.body };
    products.push(newProduct);
    res.status(201).json(newProduct);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
app.put('/api/products/:id', validateProduct, (req, res, next) => {
  try {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) throw new NotFoundError('Product not found');
    products[index] = { ...products[index], ...req.body };
    res.json(products[index]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', (req, res, next) => {
  try {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) throw new NotFoundError('Product not found');
    const deleted = products.splice(index, 1);
    res.json({ message: 'Product deleted', product: deleted[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/stats - New statistics endpoint
app.get('/api/products/stats', (req, res) => {
  const stats = {
    totalProducts: products.length,
    categories: {}
  };

  for (const product of products) {
    const cat = product.category.toLowerCase();
    stats.categories[cat] = (stats.categories[cat] || 0) + 1;
  }

  res.json(stats);
});

// === Error Handler Middleware ===
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ error: err.name, message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
