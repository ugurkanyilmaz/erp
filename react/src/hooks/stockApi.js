import api from './api';

function normalizeProduct(p) {
  return {
    id: p.id ?? p.Id,
    sku: p.sku ?? p.SKU ?? '',
    model: p.model ?? p.Model ?? '',
    title: p.title ?? p.Title ?? p.name ?? p.Name ?? '',
    stock: p.stock ?? p.Stock ?? 0,
    minStock: p.minStock ?? p.MinStock ?? 0,
    // aliases used across the UI
    stok: p.stock ?? p.Stock ?? p.stok ?? p.Stok ?? 0,
    minStok: p.minStock ?? p.MinStock ?? p.minStok ?? p.MinStok ?? 0,
  };
}

function normalizeSparePart(s) {
  return {
    id: s.id ?? s.Id,
    sku: s.sku ?? s.SKU ?? '',
    parcaNo: s.parcaNo ?? s.PartNumber ?? s.partNumber ?? '',
    title: s.title ?? s.Title ?? '',
    // bagliUrun: user-facing label for an attached product (SKU or title).
    bagliUrun: s.bagliUrun ?? (s.product?.sku ?? s.Product?.SKU) ?? (s.product?.title ?? s.Product?.Title) ?? '',
    productId: s.productId ?? s.ProductId ?? s.productId ?? null,
    product: s.product ?? s.Product ?? null,
    stok: s.stock ?? s.Stock ?? 0,
    minStok: s.minStock ?? s.MinStock ?? 0,
  };
}

export async function getProducts() {
  const res = await api.get('/api/products');
  return (res.data || []).map(normalizeProduct);
}

export async function createProduct(payload) {
  const res = await api.post('/api/products', payload);
  return normalizeProduct(res.data);
}

export async function getSpareParts() {
  const res = await api.get('/api/spareparts');
  return (res.data || []).map(normalizeSparePart);
}

export async function createSparePart(payload) {
  // payload expected in camelCase keys: { sku, partNumber, title, productId, stock, minStock }
  const res = await api.post('/api/spareparts', payload);
  return normalizeSparePart(res.data);
}

export async function updateSparePart(id, payload) {
  const res = await api.put(`/api/spareparts/${id}`, payload);
  return normalizeSparePart(res.data);
}

export async function deleteSparePart(id) {
  await api.delete(`/api/spareparts/${id}`);
  return true;
}

export async function updateProduct(id, payload) {
  const res = await api.put(`/api/products/${id}`, payload);
  return normalizeProduct(res.data);
}

export async function deleteProduct(id) {
  await api.delete(`/api/products/${id}`);
  return true;
}

export default { getProducts, createProduct, updateProduct, deleteProduct, getSpareParts, createSparePart, updateSparePart, deleteSparePart };
