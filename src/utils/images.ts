import { FALLBACK_AVATAR } from './storage';

// Converte qualquer imagem (png/jpg/svg) para dataURL PNG para uso no jsPDF.addImage
export const imageUrlToPNGDataUrl = async (url?: string) => {
  const source = url || FALLBACK_AVATAR;

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = src;
    });

  const toPngDataUrlFromSvgText = async (svgText: string) => {
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    const img = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 300;
    canvas.height = img.naturalHeight || 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas não suportado');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Erro lendo blob'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });

  try {
    const res = await fetch(source);
    if (!res.ok) throw new Error('Falha ao obter imagem');
    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('svg')) {
      const svgText = await res.text();
      return await toPngDataUrlFromSvgText(svgText);
    }

    const blob = await res.blob();
    const mime = blob.type || '';
    if (mime.includes('svg')) {
      const text = await blob.text();
      return await toPngDataUrlFromSvgText(text);
    }

    // png/jpg -> dataURL (pode ser PNG/JPEG; o jsPDF aceita ambos)
    return await blobToDataUrl(blob);
  } catch {
    // Fallback garantido
    const res = await fetch(FALLBACK_AVATAR);
    if (!res.ok) return '';
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (type.includes('svg')) {
      const svgText = await res.text();
      return await toPngDataUrlFromSvgText(svgText);
    }
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  }
};