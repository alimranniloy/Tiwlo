import React from 'react';
import { AlertCircle, Edit3, Filter, ImagePlus, Package, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import {
  createStoreProductWithApi,
  deleteStoreProductWithApi,
  fetchStoreProductsForAdmin,
  updateStoreProductWithApi
} from '../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../components/ActionConfirmation';

const productDefaults = {
  name: '',
  sku: '',
  category: '',
  price: '',
  stock: '',
  status: 'active',
  image: '',
  description: ''
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

export default function ProductsPage({ store }: { store: any }) {
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<any | null | undefined>(undefined);
  const [form, setForm] = React.useState(productDefaults);
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

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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

    setEditing(product);
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      price: String(product.price ?? ''),
      stock: String(product.stock ?? ''),
      status: product.status || 'active',
      image: product.image || '',
      description: product.description || ''
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
        description: form.description.trim() || undefined
      };
      if (editing?.id) {
        await updateStoreProductWithApi({ id: editing.id, ...payload });
      } else {
        await createStoreProductWithApi({ storeId: store.id, ...payload });
      }
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
    [product.name, product.sku, product.category, product.status].join(' ').toLowerCase().includes(query.toLowerCase())
  ));

  const formOpen = editing !== undefined;
  const productSteps = ['Basic Info', 'Media', 'Price & Stock', 'Review'];
  const canAdvance = formStep === 0 ? form.name.trim() && form.sku.trim() : formStep === 2 ? form.price !== '' : true;
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
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Create, edit, and delete products for {store?.name || 'this store'}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadProducts} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
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

      <div className="grid gap-3 md:grid-cols-6">
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
          <div className="grid grid-cols-4 border-b border-gray-200">
            {productSteps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setFormStep(index)}
                className={`border-r border-gray-200 px-3 py-3 text-left text-xs font-black uppercase tracking-wider last:border-r-0 ${formStep === index ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-sm border border-current text-[10px]">{index + 1}</span>
                {step}
              </button>
            ))}
          </div>

          <div className="p-4">
            {formStep === 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['name', 'Name'],
                  ['sku', 'SKU'],
                  ['category', 'Category']
                ].map(([key, label]) => (
                  <label key={key}>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                    <input
                      value={(form as any)[key]}
                      onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                      className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      required={['name', 'sku'].includes(key)}
                    />
                  </label>
                ))}
                <label className="md:col-span-3">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-28 w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            )}

            {formStep === 1 && (
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
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
                  <input
                    value={form.image.startsWith('data:') ? '' : form.image}
                    onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
                    placeholder="Or paste secure image URL"
                    className="w-full rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] font-medium leading-4 text-gray-400">Only image files up to 2MB are accepted. Scripts or executable files are not stored here.</p>
                </div>
              </div>
            </div>
                <div className="md:col-span-7 border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-black text-gray-900">Media checklist</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {['Main image', 'Gallery ready', 'Alt text planned', 'Safe file type'].map((item) => (
                      <div key={item} className="border border-gray-200 bg-white p-3 text-xs font-bold text-gray-600">{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['price', 'Price'],
                  ['stock', 'Stock']
                ].map(([key, label]) => (
                  <label key={key}>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                    <input
                      type="number"
                      step={key === 'price' ? '0.01' : undefined}
                      value={(form as any)[key]}
                      onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                      className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      required={key === 'price'}
                    />
                  </label>
                ))}
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
              </div>
            )}

            {formStep === 3 && (
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <div className="aspect-square border border-gray-200 bg-gray-50 flex items-center justify-center">
                    {form.image ? <img src={form.image} alt="Product preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-12 w-12 text-gray-300" />}
                  </div>
                </div>
                <div className="md:col-span-8 border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-lg font-black text-gray-900">{form.name || 'Product name'}</h3>
                  <p className="mt-1 font-mono text-xs text-gray-400">{form.sku || 'SKU'}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MetricBox label="Price" value={`${store?.currency || 'USD'} ${Number(form.price || 0).toFixed(2)}`} />
                    <MetricBox label="Stock" value={form.stock || '0'} />
                    <MetricBox label="Status" value={form.status} />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">{form.description || 'No description added.'}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
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
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-sm border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
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
                <th className="px-4 py-3 font-bold">Price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading products from API...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No products found in the database.</td></tr>
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
