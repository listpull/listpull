/* Optional source-footage import for Video Studio. The existing studio-video.js
   ingestion pathway remains unchanged. Nothing downloads until the user clicks. */
(() => {
  const button = document.getElementById('video-load-wildlife-sample');
  const status = document.getElementById('video-wildlife-sample-status');
  const input = document.getElementById('video-upload');
  if (!button || !status || !input) return;
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'Loading wildlife footage…';
    status.textContent = 'Downloading the lightweight 4.6 MB wildlife edit. Your project is unchanged.';
    try {
      if (typeof DataTransfer !== 'function') throw new Error('This browser cannot import samples automatically. Use the original MP4 link instead.');
      const response = await fetch('/assets/production/fox-cubs-editor-sample.mp4');
      if (!response.ok) throw new Error('The sample video could not be loaded. You can download it from the production page.');
      const blob = await response.blob();
      if (!blob.size || !blob.type.startsWith('video/')) throw new Error('The sample is not a playable video. Please use manual import.');
      const file = new File([blob], 'ListPull wildlife fox cubs before and after.mp4', {type:'video/mp4'});
      const list = new DataTransfer();
      list.items.add(file);
      input.files = list.files;
      input.dispatchEvent(new Event('change', {bubbles:true}));
      status.textContent = 'Wildlife footage sent to the media library. Select it, then use Add selected to timeline.';
    } catch (error) {
      status.textContent = error.message || 'Could not import wildlife footage. Open the production page to view the clip.';
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
})();
