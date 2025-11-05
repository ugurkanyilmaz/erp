import React, { useState, useEffect } from 'react';
import serviceApi from '../hooks/serviceApi';

export default function TeknikServisFoto() {
  const [waitingRecord, setWaitingRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [uploadedIds, setUploadedIds] = useState([]);

  useEffect(() => {
    loadWaitingRecord();
  }, []);

  const loadWaitingRecord = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await serviceApi.getWaitingRecord();
      if (res.waiting) {
        setWaitingRecord(res);
        // load existing photos for the record
        try {
          const ph = await serviceApi.getServiceRecordPhotos(res.recordId);
          setExistingPhotos(ph || []);
        } catch (e) {
          console.warn('Could not load existing photos', e);
          setExistingPhotos([]);
        }
      } else {
        setError(res.message || 'Henüz fotoğraf bekleyen kayıt yok.');
      }
    } catch (err) {
      console.error('Could not load waiting record', err);
      setError('Kayıt bilgisi alınamadı: ' + (err?.message || 'Hata'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    
    // Add new files to existing files (accumulate)
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Create preview URLs for new files and add to existing previews
    const newUrls = newFiles.map(f => URL.createObjectURL(f));
    setPreviewUrls(prev => [...prev, ...newUrls]);
    
    // Reset the input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!waitingRecord || selectedFiles.length === 0) return;
    
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => {
        formData.append('files', f, f.name);
      });
      
      const res = await serviceApi.uploadServiceRecordPhotos(waitingRecord.recordId, formData);
      setUploadSuccess(true);
      // show uploaded ids if available
      try {
        const saved = res && res.saved ? res.saved : [];
        setUploadedIds(saved.map(s => s.photo?.Id || s.Id || s.id || s.photo?.id).filter(Boolean));
      } catch {}
      
      // Clear selected files and previews
      setSelectedFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      
      // Show success message for 2 seconds then just refresh photos (don't reload waiting record - that clears the signal)
      setTimeout(async () => {
        setUploadSuccess(false);
        setUploadedIds([]);
        // refresh existing photos
        try {
          const ph = await serviceApi.getServiceRecordPhotos(waitingRecord.recordId);
          setExistingPhotos(ph || []);
        } catch (e) { console.warn('Could not refresh photos', e); }
        // Don't call loadWaitingRecord() here - it would reset the waiting signal and clear the page
        // User can manually refresh or close the page when done
      }, 2000);
    } catch (err) {
      console.error('Upload failed', err);
      setError('Yükleme başarısız: ' + (err?.message || 'Hata'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-700">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error && !waitingRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Fotoğraf Bekleniyor</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={loadWaitingRecord}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Yenile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📸</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Fotoğraf Yükle</h1>
            {waitingRecord && (
              <div className="bg-indigo-50 rounded-lg p-4 mt-4">
                <div className="text-sm text-slate-600 mb-1">Kayıt Bilgileri</div>
                <div className="font-semibold text-lg text-slate-800">{waitingRecord.belgeNo}</div>
                <div className="text-sm text-slate-600">{waitingRecord.servisTakipNo || waitingRecord.seriNo} • {waitingRecord.firmaIsmi}</div>
                <div className="text-xs text-slate-500 mt-1">{waitingRecord.urunModeli}</div>
              </div>
            )}
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="text-emerald-700 font-semibold">✓ Fotoğraflar başarıyla yüklendi!</div>
            </div>
          )}
          {uploadedIds && uploadedIds.length > 0 && (
            <div className="mb-4 text-center text-sm text-slate-700">Yüklenen Fotoğraf ID'leri: {uploadedIds.map(id => `#${id}`).join(', ')}</div>
          )}

          {/* Error Message */}
          {error && waitingRecord && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <div className="text-rose-700 text-sm">{error}</div>
            </div>
          )}

          {/* Camera Input */}
          <div className="mb-6">
            <label className="block mb-3">
              <div className="text-center mb-3">
                <div className="inline-flex items-center justify-center w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl font-semibold cursor-pointer hover:opacity-90 transition">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Fotoğraf Çek / Seç
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-center text-slate-500">
              Mobil cihazlarda kamera otomatik açılır. Birden fazla fotoğraf seçebilirsiniz.
            </p>
          </div>

          {/* Preview Grid */}
          {previewUrls.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-slate-700 mb-3">
                Seçilen Fotoğraflar ({selectedFiles.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img 
                      src={url} 
                      alt={`preview-${idx}`} 
                      className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                    />
                    <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {idx + 1}
                    </div>
                    {/* Delete individual preview button */}
                    <button
                      onClick={() => {
                        // Remove from preview and file list
                        const newUrls = [...previewUrls];
                        const newFiles = [...selectedFiles];
                        URL.revokeObjectURL(newUrls[idx]);
                        newUrls.splice(idx, 1);
                        newFiles.splice(idx, 1);
                        setPreviewUrls(newUrls);
                        setSelectedFiles(newFiles);
                      }}
                      className="absolute top-1 left-1 bg-red-500/80 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing uploaded photos (server-side) */}
          {existingPhotos && existingPhotos.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-slate-700 mb-3">Sunucuda Kayıtlı Fotoğraflar</div>
              <div className="grid grid-cols-3 gap-3">
                {existingPhotos.map((p) => (
                  <div key={p.id} className="relative">
                    <img src={p.url || p.Url} alt={`uploaded-${p.id}`} className="w-full h-28 object-cover rounded-lg border" />
                    <div className="mt-1 text-xs text-slate-600">#{p.id}</div>
                    <button
                      onClick={async () => {
                        if (!waitingRecord) return;
                        if (!confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?')) return;
                        try {
                          await serviceApi.deleteServiceRecordPhoto(waitingRecord.recordId, p.id);
                          // remove from UI
                          setExistingPhotos((prev) => prev.filter(x => x.id !== p.id));
                        } catch (e) {
                          console.error('Could not delete photo', e);
                          setError('Fotoğraf silinemedi');
                        }
                      }}
                      className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
                    >Sil</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedFiles([]);
                previewUrls.forEach(url => URL.revokeObjectURL(url));
                setPreviewUrls([]);
              }}
              disabled={selectedFiles.length === 0 || uploading}
              className="flex-1 px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Temizle
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Yükleniyor...' : `Tamam (${selectedFiles.length} Fotoğraf)`}
            </button>
          </div>

          {/* Refresh Button */}
          <div className="mt-4 text-center">
            <button
              onClick={loadWaitingRecord}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Kayıt Bilgisini Yenile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
