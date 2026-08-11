import { hapticFeedback } from './haptics';

export async function sharePDF(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  
  // Check if Web Share API is available and can share this file
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Invoice',
        text: 'Please find the attached invoice.',
        files: [file],
      });
      hapticFeedback('success');
      console.log('Shared successfully');
      return;
    } catch (error: any) {
      const isCanceled = error.name === 'AbortError' || (error.message && error.message.toLowerCase().includes('cancel'));
      
      if (isCanceled) {
        console.log('Share was canceled by the user.');
        return;
      }
      
      console.warn('Error sharing via Web Share API:', error);
      alert('Failed to share the file. You can use the Download button instead.');
    }
  } else {
    console.log('Web Share API unavailable.');
    alert('Sharing is not supported on this device/browser. Please use the Download button.');
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
