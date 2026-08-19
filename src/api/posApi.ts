import { api } from "../services/api";

export const getProductByBarcode = async (barcode: string) => {
  const res = await api.get(`/products/barcode/${barcode}`);
  const product = res.data;

  // ✅ Parse and return consistent product structure
  return {
    id: product.Id || product.id,
    name: product.Name || product.name,
    barcode: product.Barcode || product.barcode,
    sku: product.SKU || product.sku || '',
    price: Number(product.Price || product.price || 0),
    costPrice: Number(product.CostPrice || product.costPrice || 0),
    discount: Number(product.Discount || product.discount || 0),
    stockQty: Number(product.StockQty || product.stockQty || 0),
    reorderLevel: Number(product.ReorderLevel || product.reorderLevel || 0),
    warrantyMonths: Number(product.WarrantyMonths || product.warrantyMonths || 0),
    imageUrl: product.ImageUrl || product.imageUrl || null,
    unit: product.Unit || product.unit || 'pcs',
    isActive: product.IsActive !== undefined ? product.IsActive : true,
    categoryId: product.CategoryId || product.categoryId || null,
    brandId: product.BrandId || product.brandId || null,
    categories: product.Categories || product.categories || null,
    brand: product.Brands || product.brand || null,
  };
};

export const checkoutSale = async (data: any) => {
  console.log("POS API PAYLOAD:", data);
  const res = await api.post("/sales/checkout", data);
  return res.data;
};