/* Before/after comparison enhances static source images; navigation remains in HTML. */
document.querySelectorAll('[data-production-compare]').forEach((comparison) => {
  const range = comparison.querySelector('input[type="range"]');
  if (!range) return;
  const render = () => {
    comparison.style.setProperty('--production-split', range.value + '%');
    range.setAttribute('aria-valuetext', range.value + '% finished edit visible');
  };
  range.addEventListener('input', render);
  render();
});

/* Adapted directly from the Blobby video fallback logic. The still and play
   button remain available whenever the video is not playing. */
document.querySelectorAll('.production-video-wrap').forEach((wrapper) => {
  const button = wrapper.querySelector('.production-play-button');
  const video = wrapper.querySelector('.production-preview-video');
  if (!button || !video) return;

  const showPreview = () => {
    video.pause();
    video.currentTime = 0;
    wrapper.classList.remove('is-playing');
  };

  button.addEventListener('click', async () => {
    wrapper.classList.add('is-playing');

    try {
      await video.play();
    } catch (error) {
      showPreview();
    }
  });

  video.addEventListener('pause', () => {
    if (!video.ended) showPreview();
  });

  video.addEventListener('ended', showPreview);
  video.addEventListener('error', showPreview);
});
