import React from 'react';
import { AlertCircle, Edit3, Filter, ImagePlus, Package, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import {
  createStoreProductWithApi,
  deleteStoreProductWithApi,
  fetchStoreAdminRecordsWithApi,
  fetchStoreProductsForAdmin,
  updateStoreProductWithApi,
  upsertStoreAdminRecordWithApi
} from '../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../components/ActionConfirmation';

type ProductVariant = {
  id: string;
  color: string;
  size: string;
  sku: string;
  price: string;
  wholesalePrice: string;
  costPrice: string;
  stock: string;
  image: string;
};

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: string;
  compareAtPrice: string;
  wholesalePrice: string;
  costPrice: string;
  stock: string;
  status: string;
  image: string;
  description: string;
  colors: string;
  sizes: string;
  barcode: string;
  weight: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  variants: ProductVariant[];
};

const blankVariant = (index = 0): ProductVariant => ({
  id: `variant-${Date.now()}-${index}`,
  color: '',
  size: '',
  sku: '',
  price: '',
  wholesalePrice: '',
  costPrice: '',
  stock: '',
  image: ''
});

const productDefaults: ProductForm = {
  name: '',
  sku: '',
  category: '',
  brand: '',
  price: '',
  compareAtPrice: '',
  wholesalePrice: '',
  costPrice: '',
  stock: '',
  status: 'active',
  image: '',
  description: '',
  colors: '',
  sizes: '',
  barcode: '',
  weight: '',
  tags: '',
  seoTitle: '',
  seoDescription: '',
  variants: []
};

const readImageFile = (file: File) => new Promise<string>((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('Only image files are allowed for product images.'));
    return;
  }
  if (file.size > 1024 * 1024 * 2) {
    reject(new Error('Image must be 2MB or smaller.'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Unable to read image file.'));
  reader.readAsDataURL(file);
});

const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const splitList = (value: string) => value
  .split(/,|\n/)
  .map((item) => item.trim())
  .filter(Boolean);

const numberOrUndefined = (value: string) => {
  if (value === '') return undefined;
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
};

const variantFromMetadata = (variant: any, index: number): ProductVariant => ({
  id: variant.id || `variant-${index}`,
  color: String(variant.color || ''),
  size: String(variant.size || ''),
  sku: String(variant.sku || ''),
  price: variant.price === undefined || variant.price === null ? '' : String(variant.price),
  wholesalePrice: variant.wholesalePrice === undefined || variant.wholesalePrice === null ? '' : String(variant.wholesalePrice),
  costPrice: variant.costPrice === undefined || variant.costPrice === null ? '' : String(variant.costPrice),
  stock: variant.stock === undefined || variant.stock === null ? '' : String(variant.stock),
  image: String(variant.image || '')
});

function cleanMetadata(form: ProductForm, existing: Record<string, any> = {}) {
  const variants = form.variants
    .filter((variant) => variant.color || variant.size || variant.sku || variant.price || variant.stock)
    .map((variant, index) => ({
      id: variant.id || `variant-${index + 1}`,
      color: variant.color.trim(),
      size: variant.size.trim(),
      sku: variant.sku.trim(),
      price: numberOrUndefined(variant.price),
      wholesalePrice: numberOrUndefined(variant.wholesalePrice),
      costPrice: numberOrUndefined(variant.costPrice),
      stock: numberOrUndefined(variant.stock),
      image: variant.image.trim()
    }));

  return {
    ...existing,
    brand: form.brand.trim(),
    compareAtPrice: numberOrUndefined(form.compareAtPrice),
    wholesalePrice: numberOrUndefined(form.wholesalePrice),
    costPrice: numberOrUndefined(form.costPrice),
    colors: splitList(form.colors),
    sizes: splitList(form.sizes),
    barcode: form.barcode.trim(),
    weight: form.weight.trim(),
    tags: splitList(form.tags),
    seo: {
      title: form.seoTitle.trim(),
      description: form.seoDescription.trim()
    },
    variants
  };
}

function TaxonomyField({
  label,
  value,
  options,
  onChange,
  onCreate,
  placeholder
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onCreate: (value: string) => void;
  placeholder: string;
}) {
  const inputId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-options`;
  const exists = options.some((option) => option.toLowerCase() === value.trim().toLowerCase());
  return (
    <label>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <div className="flex gap-2">
        <input
          list={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        {value.trim() && !exists && (
          <button
            type="button"
            onClick={() => onCreate(value)}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
          >
            <Plus className="h-3 w-3" /> Create
          </button>
        )}
      </div>
      <datalist id={inputId}>
        {options.map((option) => <option key={option} value={option} />)}
      </datalist>
    </label>
  );
}

export default function ProductsPage({ store }: { store: any }) {
  const [products, setProducts] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<any | null | undefined>(undefined);
  const [form, setForm] = React.useState<ProductForm>(productDefaults);
  const [formStep, setFormStep] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadProducts = React.useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    setError('');
    try {
      setProducts(await fetchStoreProductsForAdmin(store.id));
    } catch (err) {
      setProducts([]);
      setError(err instanceof Error ? err.message : 'Unable to load products');
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  const loadTaxonomies = React.useCallback(async () => {
    if (!store?.id) return;
    try {
      const [categoryRows, brandRows] = await Promise.all([
        fetchStoreAdminRecordsWithApi(store.id, 'categories'),
        fetchStoreAdminRecordsWithApi(store.id, 'brands')
      ]);
      setCategories(categoryRows);
      setBrands(brandRows);
    } catch {
      setCategories([]);
      setBrands([]);
    }
  }, [store?.id]);

  React.useEffect(() => {
    loadProducts();
    loadTaxonomies();
  }, [loadProducts, loadTaxonomies]);

  const categoryOptions = React.useMemo(() => Array.from(new Set([
    ...categories.map((item) => item.data?.name || item.title).filter(Boolean),
    ...products.map((product) => product.category).filter(Boolean)
  ].map(String))).sort(), [categories, products]);

  const brandOptions = React.useMemo(() => Array.from(new Set([
    ...brands.map((item) => item.data?.name || item.title).filter(Boolean),
    ...products.map((product) => product.metadata?.brand).filter(Boolean)
  ].map(String))).sort(), [brands, products]);

  const createTaxonomy = async (section: 'categories' | 'brands', value: string) => {
    if (!store?.id || !value.trim()) return;
    const name = value.trim();
    const source = section === 'categories' ? categories : brands;
    const existing = source.find((item) => String(item.data?.name || item.title || '').toLowerCase() === name.toLowerCase());
    await upsertStoreAdminRecordWithApi({
      storeId: store.id,
      section,
      id: existing?.id,
      title: name,
      status: 'active',
      data: {
        name,
        slug: slugify(name),
        type: section === 'categories' ? 'main' : undefined,
        image: '',
        logo: ''
      }
    });
    await loadTaxonomies();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(productDefaults);
    setFormStep(0);
  };

  const openEdit = async (product: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit product?',
      message: 'Are you sure you want to edit this product?',
      resourceName: product.name
    });
    if (!confirmed) return;

    const metadata = product.metadata || {};
    setEditing(product);
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      brand: metadata.brand || '',
      price: String(product.price ?? ''),
      compareAtPrice: metadata.compareAtPrice === undefined || metadata.compareAtPrice === null ? '' : String(metadata.compareAtPrice),
      wholesalePrice: metadata.wholesalePrice === undefined || metadata.wholesalePrice === null ? '' : String(metadata.wholesalePrice),
      costPrice: metadata.costPrice === undefined || metadata.costPrice === null ? '' : String(metadata.costPrice),
      stock: String(product.stock ?? ''),
      status: product.status || 'active',
      image: product.image || '',
      description: product.description || '',
      colors: Array.isArray(metadata.colors) ? metadata.colors.join(', ') : String(metadata.colors || ''),
      sizes: Array.isArray(metadata.sizes) ? metadata.sizes.join(', ') : String(metadata.sizes || ''),
      barcode: metadata.barcode || '',
      weight: metadata.weight || '',
      tags: Array.isArray(metadata.tags) ? metadata.tags.join(', ') : String(metadata.tags || ''),
      seoTitle: metadata.seo?.title || '',
      seoDescription: metadata.seo?.description || '',
      variants: Array.isArray(metadata.variants) ? metadata.variants.map(variantFromMetadata) : []
    });
    setFormStep(0);
  };

  const closeForm = () => {
    setEditing(undefined);
    setForm(productDefaults);
    setFormStep(0);
  };

  const handleImageFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await readImageFile(file);
      setForm((prev) => ({ ...prev, image: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load image');
    }
  };

  const handleVariantImage = async (index: number, file?: File) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await readImageFile(file);
      setForm((prev) => ({
        ...prev,
        variants: prev.variants.map((variant, itemIndex) => itemIndex === index ? { ...variant, image: dataUrl } : variant)
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load variant image');
    }
  };

  const addVariant = () => {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, blankVariant(prev.variants.length)] }));
  };

  const updateVariant = (index: number, key: keyof ProductVariant, value: string) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, itemIndex) => itemIndex === index ? { ...variant, [key]: value } : variant)
    }));
  };

  const removeVariant = (index: number) => {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!store?.id) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim() || 'General',
        price: Number(form.price || 0),
        stock: Number(form.stock || 0),
        status: form.status,
        image: form.image.trim() || undefined,
        description: form.description.trim() || undefined,
        metadata: cleanMetadata(form, editing?.metadata || {})
      };
      if (editing?.id) {
        await updateStoreProductWithApi({ id: editing.id, ...payload });
      } else {
        await createStoreProductWithApi({ storeId: store.id, ...payload });
      }
      if (form.category.trim()) await createTaxonomy('categories', form.category);
      if (form.brand.trim()) await createTaxonomy('brands', form.brand);
      closeForm();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete product?',
      message: 'Are you sure you want to delete this product?',
      resourceName: product.name
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteStoreProductWithApi(product.id);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete product');
    }
  };

  const filteredProducts = products.filter((product) => (
    (statusFilter === 'all' ||
      String(product.status || '').toLowerCase() === statusFilter ||
      (statusFilter === 'low-stock' && Number(product.stock || 0) <= 5) ||
      (statusFilter === 'no-image' && !product.image)) &&
    [product.name, product.sku, product.category, product.metadata?.brand, product.status].join(' ').toLowerCase().includes(query.toLowerCase())
  ));

  const formOpen = editing !== undefined;
  const productSteps = ['Product', 'Media', 'Pricing & Variants', 'Review'];
  const canAdvance = formStep === 0 ? form.name.trim() && form.sku.trim() && form.category.trim() : formStep === 2 ? form.price !== '' : true;
  const productStats = [
    ['All', products.length, 'all'],
    ['Active', products.filter((product) => product.status === 'active').length, 'active'],
    ['Draft', products.filter((product) => product.status === 'draft').length, 'draft'],
    ['Archived', products.filter((product) => product.status === 'archived').length, 'archived'],
    ['Low Stock', products.filter((product) => Number(product.stock || 0) <= 5).length, 'low-stock'],
    ['No Image', products.filter((product) => !product.image).length, 'no-image']
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Create catalog products with category, brand, pricing, variants, and storefront metadata.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadProducts(); loadTaxonomies(); }} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-sm bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">
            <Plus className="h-3.5 w-3.5" /> Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {productStats.map(([label, count, key]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`border px-4 py-3 text-left ${statusFilter === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-1 text-xl font-black text-gray-900">{count}</p>
          </button>
        ))}
      </div>

      {formOpen && (
        <form onSubmit={saveProduct} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <p className="text-[11px] font-medium text-gray-400">Step {formStep + 1} of {productSteps.length}: {productSteps[formStep]}</p>
            </div>
            <button type="button" onClick={closeForm} className="rounded-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 border-b border-gray-200 lg:grid-cols-4">
            {productSteps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setFormStep(index)}
                className={`border-r border-gray-200 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider last:border-r-0 ${formStep === index ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-sm border border-current text-[10px]">{index + 1}</span>
                {step}
              </button>
            ))}
          </div>

          <div className="p-4">
            {formStep === 0 && (
              <div className="grid gap-4 lg:grid-cols-3">
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Product name</span>
                  <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">SKU</span>
                  <input value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Barcode</span>
                  <input value={form.barcode} onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))} className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </label>
                <TaxonomyField label="Category" value={form.category} options={categoryOptions} placeholder="Search or create category" onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} onCreate={(value) => createTaxonomy('categories', value)} />
                <TaxonomyField label="Brand" value={form.brand} options={brandOptions} placeholder="Search or create brand" onChange={(value) => setForm((prev) => ({ ...prev, brand: value }))} onCreate={(value) => createTaxonomy('brands', value)} />
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
                  <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
                <label className="lg:col-span-3">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Description</span>
                  <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="min-h-28 w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </label>
              </div>
            )}

            {formStep === 1 && (
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Product Image</span>
                  <div className="overflow-hidden rounded-sm border border-gray-200 bg-gray-50">
                    <div className="flex aspect-square items-center justify-center bg-white">
                      {form.image ? <img src={form.image} alt="Product preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-12 w-12 text-gray-300" />}
                    </div>
                    <div className="space-y-3 border-t border-gray-200 p-3">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
                        <Upload className="h-3.5 w-3.5" />
                        Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageFile(event.target.files?.[0])} />
                      </label>
                      <input value={form.image.startsWith('data:') ? '' : form.image} onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))} placeholder="Or paste secure image URL" className="w-full rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 border border-gray-200 bg-gray-50 p-4 lg:col-span-7 lg:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Colors</span>
                    <input value={form.colors} onChange={(event) => setForm((prev) => ({ ...prev, colors: event.target.value }))} placeholder="Black, Blue, Red" className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Sizes</span>
                    <input value={form.sizes} onChange={(event) => setForm((prev) => ({ ...prev, sizes: event.target.value }))} placeholder="S, M, L, XL" className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Tags</span>
                    <input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="new, featured, sale" className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Weight</span>
                    <input value={form.weight} onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))} placeholder="0.5 kg" className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </label>
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-5">
                  {[
                    ['price', 'Sale price'],
                    ['compareAtPrice', 'Compare price'],
                    ['wholesalePrice', 'Wholesale price'],
                    ['costPrice', 'Cost price'],
                    ['stock', 'Stock']
                  ].map(([key, label]) => (
                    <label key={key}>
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                      <input type="number" step={key === 'stock' ? undefined : '0.01'} value={(form as any)[key]} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required={key === 'price'} />
                    </label>
                  ))}
                </div>

                <div className="border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Variant pricing</h3>
                      <p className="text-[11px] font-medium text-gray-400">Set color and size wise price, wholesale, cost, stock, and image.</p>
                    </div>
                    <button type="button" onClick={addVariant} className="inline-flex items-center gap-2 rounded-sm bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">
                      <Plus className="h-3.5 w-3.5" /> Add Variant
                    </button>
                  </div>
                  <div className="space-y-3 p-4">
                    {form.variants.length === 0 ? (
                      <div className="border border-dashed border-gray-200 bg-white p-6 text-center text-sm font-bold text-gray-400">No variants yet. Add one when color or size changes price or stock.</div>
                    ) : form.variants.map((variant, index) => (
                      <div key={variant.id} className="grid gap-3 border border-gray-200 bg-white p-3 lg:grid-cols-9">
                        <input value={variant.color} onChange={(event) => updateVariant(index, 'color', event.target.value)} placeholder="Color" className="rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                        <input value={variant.size} onChange={(event) => updateVariant(index, 'size', event.target.value)} placeholder="Size" className="rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                        <input value={variant.sku} onChange={(event) => updateVariant(index, 'sku', event.target.value)} placeholder="Variant SKU" className="rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500 lg:col-span-2" />
                        <input type="number" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, 'price', event.target.value)} placeholder="Price" className="rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                        <input type="number" step="0.01" value={variant.wholesalePrice} onChange={(event) => updateVariant(index, 'wholesalePrice', event.target.value)} placeholder="Wholesale" className="rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                        <input type="number" step="0.01" value={variant.costPrice} onChange={(event) => updateVariant(index, 'costPrice', event.target.value)} placeholder="Cost" className="rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                        <input type="number" value={variant.stock} onChange={(event) => updateVariant(index, 'stock', event.target.value)} placeholder="Stock" className="rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                        <div className="flex items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center rounded-sm border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100">
                            <Upload className="h-3.5 w-3.5" />
                            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleVariantImage(index, event.target.files?.[0])} />
                          </label>
                          <button type="button" onClick={() => removeVariant(index)} className="rounded-sm border border-red-100 p-2 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formStep === 3 && (
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <div className="flex aspect-square items-center justify-center border border-gray-200 bg-gray-50">
                    {form.image ? <img src={form.image} alt="Product preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-12 w-12 text-gray-300" />}
                  </div>
                </div>
                <div className="border border-gray-200 bg-gray-50 p-4 lg:col-span-8">
                  <h3 className="text-lg font-black text-gray-900">{form.name || 'Product name'}</h3>
                  <p className="mt-1 font-mono text-xs text-gray-400">{form.sku || 'SKU'} {form.brand ? `- ${form.brand}` : ''}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <MetricBox label="Price" value={`${store?.currency || 'USD'} ${Number(form.price || 0).toFixed(2)}`} />
                    <MetricBox label="Wholesale" value={form.wholesalePrice || '-'} />
                    <MetricBox label="Stock" value={form.stock || '0'} />
                    <MetricBox label="Variants" value={String(form.variants.length)} />
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">SEO title</span>
                      <input value={form.seoTitle} onChange={(event) => setForm((prev) => ({ ...prev, seoTitle: event.target.value }))} className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">SEO description</span>
                      <input value={form.seoDescription} onChange={(event) => setForm((prev) => ({ ...prev, seoDescription: event.target.value }))} className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </label>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">{form.description || 'No description added.'}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button type="button" onClick={closeForm} className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="button" disabled={formStep === 0} onClick={() => setFormStep((step) => Math.max(0, step - 1))} className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Back</button>
            {formStep < productSteps.length - 1 ? (
              <button type="button" disabled={!canAdvance} onClick={() => setFormStep((step) => Math.min(productSteps.length - 1, step + 1))} className="rounded-sm bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">Next Step</button>
            ) : (
              <button disabled={saving} className="rounded-sm bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            )}
          </div>
        </form>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products..." className="w-full rounded-sm border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <button className="rounded-sm border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50">
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Inventory</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Brand</th>
                <th className="px-4 py-3 font-bold">Price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading products from API...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No products found in the database.</td></tr>
              ) : filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center border border-gray-200 bg-gray-50">
                        {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-gray-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{product.name}</p>
                        <p className="font-mono text-xs text-gray-400">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{product.status}</span></td>
                  <td className="px-4 py-3 font-bold text-gray-700">{product.stock}</td>
                  <td className="px-4 py-3 text-gray-600">{product.category}</td>
                  <td className="px-4 py-3 text-gray-600">{product.metadata?.brand || '-'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{store?.currency || 'USD'} {Number(product.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEdit(product)} className="rounded-sm border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteProduct(product)} className="rounded-sm border border-red-100 p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-gray-900">{value}</p>
    </div>
  );
}
