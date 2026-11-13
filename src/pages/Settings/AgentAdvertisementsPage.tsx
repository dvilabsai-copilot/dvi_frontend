/* DVI_AGENT_ADS_CLEAN_WIDE_BANNER_V3 */
/* DVI_AGENT_ADS_ADMIN_20261113: Super Admin-only content management for the Agent dashboard hero. */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Loader2, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAuthenticatedRoleId } from '@/services/accessControl';
import { USER_ROLES } from '@/constants/systemRoles';
import {
  agentAdImageUrl,
  deleteAgentDashboardAd,
  listAgentDashboardAds,
  saveAgentDashboardAd,
  setAgentDashboardAdEnabled,
  uploadAgentDashboardAdImage,
  type AgentDashboardAd,
  type AgentDashboardAdInput,
} from '@/services/agentDashboardAds';

const emptyForm: AgentDashboardAdInput = {
  title: '', imagePath: '', targetUrl: null, enabled: false, sortOrder: 0,
};

// DVI_ADS_EXACT_BANNER_SIZE_V4: validate actual decoded pixel dimensions, not only aspect ratio.
const REQUIRED_BANNER_WIDTH = 1320;
const REQUIRED_BANNER_HEIGHT = 248;
const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const ACCEPTED_BANNER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function readBannerPixels(selectedFile: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(selectedFile);
    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Cannot read this image. Please choose a valid PNG, JPG or WebP banner.'));
    };
    image.src = objectUrl;
  });
}

export function AgentAdvertisementsPage() {
  const isAdmin = getAuthenticatedRoleId() === USER_ROLES.ADMIN;
  const [ads, setAds] = useState<AgentDashboardAd[]>([]);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [form, setForm] = useState<AgentDashboardAdInput>({ ...emptyForm });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState('');
  // DVI_AGENT_ADS_IMAGE_DIMENSIONS_V2: Warn about unsuitable photo/screenshot proportions.
  const [bannerDimensions, setBannerDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageError, setImageError] = useState('');
  const [imageAccepted, setImageAccepted] = useState('');
  const [imageChecking, setImageChecking] = useState(false);
  const imageSelectionId = useRef(0);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const reload = useCallback(async () => {
    try {
      const result = await listAgentDashboardAds();
      setAds(result);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load advertisements';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void reload().catch(() => undefined);
  }, [isAdmin, reload]);

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const source = preview || agentAdImageUrl(form.imagePath);
    if (!source) { setBannerDimensions(null); return; }
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) setBannerDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => { if (active) setBannerDimensions(null); };
    image.src = source;
    return () => { active = false; };
  }, [preview, form.imagePath]);

  const selectBannerImage = async (selected: File | null, input: HTMLInputElement) => {
    const selection = ++imageSelectionId.current;
    setFile(null);
    setImageError('');
    setImageAccepted('');
    setImageChecking(false);
    if (!selected) return;

    let errorMessage = '';
    if (!ACCEPTED_BANNER_TYPES.includes(selected.type)) {
      errorMessage = 'Invalid image format. Use PNG, JPG or WebP.';
    } else if (selected.size === 0 || selected.size > MAX_BANNER_BYTES) {
      errorMessage = 'Image not allowed. File size must be greater than 0 and at most 5 MB.';
    }
    if (errorMessage) {
      setImageError(errorMessage);
      toast.error(errorMessage);
      input.value = '';
      return;
    }

    setImageChecking(true);
    try {
      const { width, height } = await readBannerPixels(selected);
      if (imageSelectionId.current !== selection) return;
      if (width !== REQUIRED_BANNER_WIDTH || height !== REQUIRED_BANNER_HEIGHT) {
        errorMessage = `Image rejected: selected ${width} × ${height} px. Required exactly 1320 × 248 px. Resize or crop your image and try again.`;
        setImageError(errorMessage);
        toast.error(errorMessage);
        input.value = '';
        return;
      }
      setFile(selected);
      setImageAccepted('Image accepted: exactly 1320 × 248 px.');
    } catch (error) {
      if (imageSelectionId.current !== selection) return;
      errorMessage = error instanceof Error ? error.message : 'Unable to read image dimensions.';
      setImageError(errorMessage);
      toast.error(errorMessage);
      input.value = '';
    } finally {
      if (imageSelectionId.current === selection) setImageChecking(false);
    }
  };


  const reset = () => {
    imageSelectionId.current += 1;
    setImageError('');
    setImageAccepted('');
    setImageChecking(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setEditingId(undefined);
    setFile(null);
    setForm({ ...emptyForm });
  };

  const edit = (ad: AgentDashboardAd) => {
    imageSelectionId.current += 1;
    setImageError('');
    setImageAccepted('');
    setImageChecking(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setEditingId(ad.id);
    setFile(null);
    setForm({
      title: ad.title,
      imagePath: ad.imagePath,
      targetUrl: ad.targetUrl,
      enabled: ad.enabled,
      sortOrder: ad.sortOrder,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (imageChecking) { toast.error('Please wait while the banner dimensions are checked.'); return; }
    if (imageError) { toast.error(imageError); return; }
    if (!form.title.trim()) { toast.error('Advertisement title is required'); return; }
    if (!file && !form.imagePath) { toast.error('Choose an advertisement image'); return; }
    const link = form.targetUrl?.trim() || null;
    if (link) {
      try {
        const candidate = new URL(link);
        if (candidate.protocol !== 'https:') throw new Error('Not HTTPS');
      } catch {
        toast.error('Link must be a full HTTPS URL');
        return;
      }
    }
    if (!Number.isInteger(form.sortOrder) || form.sortOrder < 0 || form.sortOrder > 9999) {
      toast.error('Order must be a whole number between 0 and 9999');
      return;
    }
    setSaving(true);
    try {
      // Defensive second check: never call the upload API with nonmatching image pixels.
      if (file) {
        const { width, height } = await readBannerPixels(file);
        if (width !== REQUIRED_BANNER_WIDTH || height !== REQUIRED_BANNER_HEIGHT) {
          const message = `Image rejected: ${width} × ${height} px. Required exactly 1320 × 248 px.`;
          setImageError(message);
          toast.error(message);
          return;
        }
      }
      const imagePath = file ? await uploadAgentDashboardAdImage(file) : form.imagePath;
      await saveAgentDashboardAd({ ...form, title: form.title.trim(), imagePath, targetUrl: link }, editingId);
      await reload();
      toast.success(editingId ? 'Advertisement updated' : 'Advertisement created');
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save advertisement');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (ad: AgentDashboardAd) => {
    if (actionId !== null) return;
    setActionId(ad.id);
    try {
      await setAgentDashboardAdEnabled(ad.id, !ad.enabled);
      await reload();
      toast.success(!ad.enabled ? 'Advertisement published' : 'Advertisement unpublished');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update advertisement');
    } finally {
      setActionId(null);
    }
  };

  const remove = async (ad: AgentDashboardAd) => {
    if (actionId !== null || !window.confirm(`Delete advertisement "${ad.title}"?`)) return;
    setActionId(ad.id);
    try {
      await deleteAgentDashboardAd(ad.id);
      await reload();
      if (editingId === ad.id) reset();
      toast.success('Advertisement deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete advertisement');
    } finally {
      setActionId(null);
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-sm text-red-600" role="alert">Only Super Admin can manage advertisements.</div>;
  }

  return (
    <main className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-slate-900"><Megaphone size={23} className="text-violet-600" /><h1 className="text-2xl font-bold">Agent Dashboard Advertisements</h1></div>
          <p className="text-sm text-slate-500">Manage banners shown in the wide welcome area of every Agent dashboard. Published banners rotate every 5 seconds.</p>
        </div>

      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle className="text-lg">{editingId ? 'Edit Advertisement' : 'Create Advertisement'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(event) => void save(event)} className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="ad-title">Title *</Label><Input id="ad-title" maxLength={120} required value={form.title} placeholder="e.g. Kerala Holiday Offer" onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="ad-file">Banner image *</Label>
                <label htmlFor="ad-file" className="flex aspect-[1320/248] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-violet-300 bg-violet-50/40 px-2 text-center">
                  {preview || form.imagePath ? (
                    <img src={preview || agentAdImageUrl(form.imagePath)} className="max-h-40 w-full rounded-lg object-contain" alt="Advertisement preview" />
                  ) : <><ImagePlus size={18} className="text-violet-500" /><span className="mt-1 text-xs font-medium">Click to upload a banner</span></>}
                </label>
                <Input ref={imageInputRef} id="ad-file" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2" aria-describedby="ad-size-rule ad-image-validation" onChange={(event) => {
                  const selected = event.currentTarget.files?.[0] || null;
                  void selectBannerImage(selected, event.currentTarget);
                }} />
                <p id="ad-size-rule" className="text-xs font-semibold text-violet-700">Required image size: exactly 1320 × 248 px (5.32:1). PNG/JPG/WebP · Max 5 MB.</p>
                <p className="text-xs text-slate-500">Images larger, smaller, or in any other dimensions will not be uploaded.</p>
                {imageChecking && <p id="ad-image-validation" role="status" className="text-xs text-violet-700">Checking image dimensions...</p>}
                {imageError && <p id="ad-image-validation" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{imageError}</p>}
                {imageAccepted && !imageError && <p id="ad-image-validation" role="status" className="text-xs font-semibold text-emerald-700">{imageAccepted}</p>}
                {bannerDimensions && (
                  <p className={`text-xs ${bannerDimensions.width === REQUIRED_BANNER_WIDTH && bannerDimensions.height === REQUIRED_BANNER_HEIGHT ? 'text-emerald-700' : 'font-medium text-amber-700'}`}>
                    Preview dimensions: {bannerDimensions.width} × {bannerDimensions.height} px.
                    {(bannerDimensions.width !== REQUIRED_BANNER_WIDTH || bannerDimensions.height !== REQUIRED_BANNER_HEIGHT)
                      ? ' This image was uploaded before the exact-size rule; replace it with a 1320 × 248 px banner when updating the image.'
                      : ' Exact required size.'}
                  </p>
                )}
              </div>
              <div className="space-y-1.5"><Label htmlFor="ad-url">Advertisement link (optional)</Label><Input id="ad-url" type="url" placeholder="https://example.com/offer" value={form.targetUrl || ''} onChange={(event) => setForm((old) => ({ ...old, targetUrl: event.target.value || null }))} /><p className="text-xs text-slate-500">An HTTPS link appears in the Sponsored label on the Agent banner.</p></div>
              <div className="space-y-1.5"><Label htmlFor="ad-order">Display order</Label><Input id="ad-order" type="number" min={0} max={9999} step={1} value={form.sortOrder} onChange={(event) => setForm((old) => ({ ...old, sortOrder: Number(event.target.value) }))} /></div>

              <div className="flex gap-2"><Button disabled={saving || imageChecking || Boolean(imageError)} type="submit" className="flex-1 bg-violet-700 hover:bg-violet-800">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? 'Update Advertisement' : 'Save Advertisement'}</Button>{editingId && <Button type="button" variant="outline" onClick={reset}>Cancel</Button>}</div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">All Advertisements ({ads.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}. This frontend connects to an existing advertisement API. No backend or database changes were made; the API must support the routes documented in API_CONTRACT.md. <Button variant="outline" size="sm" className="ml-2" onClick={() => void reload().catch(() => undefined)}>Retry</Button></div>}
            {loading && <div className="py-10 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading advertisements...</div>}
            {!loading && !error && ads.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No advertisements yet. The Agent dashboard will continue to show its six destination images.</p>}
            {ads.map((ad) => (
              <div key={ad.id} className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center">
                <img src={agentAdImageUrl(ad.imagePath)} alt={ad.title} className="h-[90px] w-full rounded-lg bg-slate-100 object-contain sm:w-[210px]" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-semibold text-slate-900" title={ad.title}>{ad.title}</p>
                  <p className="text-xs text-slate-500">Order {ad.sortOrder} · {ad.enabled ? 'Published' : 'Draft / unpublished'}</p>
                  {ad.targetUrl && <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-violet-600 underline">{ad.targetUrl}</a>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" size="sm" variant="outline" disabled={actionId !== null} onClick={() => void toggle(ad)}>{ad.enabled ? 'Unpublish' : 'Publish'}</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => edit(ad)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                    <Button type="button" size="sm" variant="outline" className="text-red-600" disabled={actionId !== null} onClick={() => void remove(ad)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
