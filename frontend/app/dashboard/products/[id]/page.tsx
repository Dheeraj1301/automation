"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, Category, ProductDetail, ProductStatus, Variant } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("active");

  async function load() {
    if (!token || !currentOrg) return;
    try {
      const p = await api.getProduct(currentOrg.id, id, token);
      setProduct(p);
      setName(p.name);
      setDescription(p.description ?? "");
      setCategoryId(p.category_id ?? "");
      setStatus(p.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load product");
    }
  }

  useEffect(() => {
    load();
    if (token && currentOrg) {
      api.listCategories(currentOrg.id, token).then(setCategories).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id, id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !currentOrg) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.updateProduct(
        currentOrg.id,
        id,
        { name, description: description || null, category_id: categoryId || null, status },
        token
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!token || !currentOrg) return;
    if (!confirm("Delete this product and all its variants/images?")) return;
    try {
      await api.deleteProduct(currentOrg.id, id, token);
      router.push("/dashboard/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete product");
    }
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token || !currentOrg) return;
    setIsUploadingImage(true);
    try {
      await api.uploadProductImage(currentOrg.id, id, file, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload image");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!token || !currentOrg) return;
    try {
      await api.deleteProductImage(currentOrg.id, id, imageId, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete image");
    }
  }

  if (!currentOrg || !product) return null;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{product.name}</h1>
        <Link href="/dashboard/products" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
          Back to products
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={handleDeleteProduct} className="text-sm text-red-600 hover:underline">
              Delete product
            </button>
          </div>
        </form>
      </section>

      <VariantsSection product={product} onChanged={load} />

      <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Images</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          {product.images.map((img) => (
            <div key={img.id} className="group relative h-20 w-20 overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${API_URL}${img.file_path}`} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => handleDeleteImage(img.id)}
                className="absolute right-0 top-0 hidden bg-black/60 px-1 text-xs text-white group-hover:block"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <label className="cursor-pointer text-sm font-medium text-brand-600 hover:underline">
          {isUploadingImage ? "Uploading..." : "Add image"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploadingImage}
          />
        </label>
      </section>
    </div>
  );
}

function VariantsSection({ product, onChanged }: { product: ProductDetail; onChanged: () => Promise<void> }) {
  const { token } = useAuth();
  const { currentOrg } = useOrg();
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [inventoryCount, setInventoryCount] = useState("0");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddVariant(e: FormEvent) {
    e.preventDefault();
    if (!token || !currentOrg) return;
    setIsAdding(true);
    setError(null);
    try {
      await api.addVariant(
        currentOrg.id,
        product.id,
        { sku, size: size || undefined, color: color || undefined, price, inventory_count: Number(inventoryCount) || 0 },
        token
      );
      setSku("");
      setSize("");
      setColor("");
      setPrice("");
      setInventoryCount("0");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add variant");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleUpdateVariant(variant: Variant, field: "price" | "inventory_count", value: string) {
    if (!token || !currentOrg) return;
    try {
      if (field === "price") {
        await api.updateVariant(currentOrg.id, product.id, variant.id, { price: value }, token);
      } else {
        await api.updateVariant(currentOrg.id, product.id, variant.id, { inventory_count: Number(value) || 0 }, token);
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update variant");
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!token || !currentOrg) return;
    try {
      await api.deleteVariant(currentOrg.id, product.id, variantId, token);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete variant");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Variants</h2>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <table className="mb-4 w-full text-left text-sm">
        <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="py-2">SKU</th>
            <th className="py-2">Size</th>
            <th className="py-2">Color</th>
            <th className="py-2">Price</th>
            <th className="py-2">Inventory</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {product.variants.map((v) => (
            <tr key={v.id}>
              <td className="py-2 text-gray-700 dark:text-gray-300">{v.sku}</td>
              <td className="py-2 text-gray-700 dark:text-gray-300">{v.size ?? "—"}</td>
              <td className="py-2 text-gray-700 dark:text-gray-300">{v.color ?? "—"}</td>
              <td className="py-2">
                <input
                  defaultValue={v.price}
                  onBlur={(e) => e.target.value !== v.price && handleUpdateVariant(v, "price", e.target.value)}
                  className="w-20 rounded border border-gray-300 px-1 py-0.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </td>
              <td className="py-2">
                <input
                  defaultValue={v.inventory_count}
                  onBlur={(e) =>
                    e.target.value !== String(v.inventory_count) && handleUpdateVariant(v, "inventory_count", e.target.value)
                  }
                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </td>
              <td className="py-2">
                {product.variants.length > 1 && (
                  <button onClick={() => handleDeleteVariant(v.id)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={handleAddVariant} className="flex flex-wrap items-end gap-2">
        <input required placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        <input placeholder="Size" value={size} onChange={(e) => setSize(e.target.value)} className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        <input placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        <input required type="number" step="0.01" min="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        <input type="number" min="0" placeholder="Inventory" value={inventoryCount} onChange={(e) => setInventoryCount(e.target.value)} className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        <button
          type="submit"
          disabled={isAdding}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Add variant
        </button>
      </form>
    </section>
  );
}
