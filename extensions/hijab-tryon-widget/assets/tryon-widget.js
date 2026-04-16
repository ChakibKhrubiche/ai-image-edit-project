(function () {
  'use strict';

  function init() {
    var root = document.getElementById('hijab-tryon-root');
    if (!root) return;

    var shopDomain = root.dataset.shop;
    var productImageUrl = root.dataset.productImage;
    var productId = root.dataset.productId || 'unknown';
    var backendUrl = (root.dataset.backendUrl || 'https://hijabtryon.com').replace(/\/$/, '');
    var buttonText = root.dataset.buttonText || 'Essayer ce hijab';

    if (!shopDomain || !productImageUrl) return;

    var btn = document.createElement('button');
    btn.className = 'hijab-tryon-btn';
    btn.textContent = '🪞 ' + buttonText;
    btn.addEventListener('click', function () {
      openModal(shopDomain, productImageUrl, productId, backendUrl);
    });
    root.appendChild(btn);
  }

  function openModal(shopDomain, productImageUrl, productId, backendUrl) {
    var overlay = document.createElement('div');
    overlay.className = 'hijab-tryon-overlay';
    overlay.innerHTML =
      '<div class="hijab-tryon-modal">' +
        '<button class="hijab-tryon-close" aria-label="Fermer">&times;</button>' +
        '<h2>Essayer ce hijab</h2>' +
        '<div class="hijab-tryon-upload">' +
          '<label class="hijab-tryon-upload-label">' +
            '<span class="hijab-tryon-upload-icon">📷</span>' +
            '<span>Choisir ma photo</span>' +
            '<small>JPG, PNG — max 10 Mo</small>' +
            '<input type="file" id="hijab-tryon-file" accept="image/jpeg,image/png,image/webp" />' +
          '</label>' +
          '<img class="hijab-tryon-preview" id="hijab-tryon-preview" alt="Aperçu" />' +
        '</div>' +
        '<button class="hijab-tryon-generate" id="hijab-tryon-generate" disabled>Générer le try-on</button>' +
        '<div class="hijab-tryon-loading" id="hijab-tryon-loading">' +
          '<p class="hijab-tryon-loading-text">Génération en cours…</p>' +
          '<div class="hijab-tryon-progress-track">' +
            '<div class="hijab-tryon-progress-bar" id="hijab-tryon-progress-bar"></div>' +
          '</div>' +
        '</div>' +
        '<div class="hijab-tryon-result" id="hijab-tryon-result">' +
          '<img id="hijab-tryon-result-img" alt="Résultat try-on" />' +
          '<button class="hijab-tryon-download" id="hijab-tryon-download">⬇ Télécharger</button>' +
        '</div>' +
        '<div class="hijab-tryon-error" id="hijab-tryon-error"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    var closeBtn    = overlay.querySelector('.hijab-tryon-close');
    var fileInput   = overlay.querySelector('#hijab-tryon-file');
    var preview     = overlay.querySelector('#hijab-tryon-preview');
    var generateBtn = overlay.querySelector('#hijab-tryon-generate');
    var loading     = overlay.querySelector('#hijab-tryon-loading');
    var progressBar = overlay.querySelector('#hijab-tryon-progress-bar');
    var result      = overlay.querySelector('#hijab-tryon-result');
    var resultImg   = overlay.querySelector('#hijab-tryon-result-img');
    var downloadBtn = overlay.querySelector('#hijab-tryon-download');
    var errorBox    = overlay.querySelector('#hijab-tryon-error');

    var customerPhotoBase64 = null;
    var progressInterval = null;
    var generatedImageUrl = null;

    function closeModal() {
      if (progressInterval) clearInterval(progressInterval);
      document.body.removeChild(overlay);
    }

    // Inject keyframes once into the page <head>
    if (!document.getElementById('hijab-tryon-keyframes')) {
      var kf = document.createElement('style');
      kf.id = 'hijab-tryon-keyframes';
      kf.textContent =
        '@keyframes hijab-progress{' +
        '0%{width:0%}10%{width:18%}25%{width:38%}' +
        '45%{width:58%}65%{width:74%}80%{width:83%}100%{width:93%}}';
      document.head.appendChild(kf);
    }

    function startProgress() {
      progressBar.style.cssText =
        'height:100%;width:0%;border-radius:99px;' +
        'background:linear-gradient(90deg,#7c3aed,#a78bfa);' +
        'animation:hijab-progress 35s ease-out forwards;';
    }

    function completeProgress() {
      progressBar.style.animation = 'none';
      progressBar.style.transition = 'width 0.4s ease';
      progressBar.style.width = '100%';
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    fileInput.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (ev) {
        customerPhotoBase64 = ev.target.result;
        preview.src = customerPhotoBase64;
        preview.style.display = 'block';
        generateBtn.disabled = false;
        hideError();
        result.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    generateBtn.addEventListener('click', function () {
      if (!customerPhotoBase64) return;

      generateBtn.disabled = true;
      loading.style.display = 'block';
      result.style.display = 'none';
      hideError();
      startProgress();

      fetch(backendUrl + '/api/shopify/tryon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shop-Domain': shopDomain,
        },
        body: JSON.stringify({
          customerPhoto: customerPhotoBase64,
          productImageUrl: productImageUrl,
          productId: productId,
        }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          completeProgress();
          setTimeout(function () {
            loading.style.display = 'none';
            if (!data.success) throw new Error(data.error || 'Génération échouée');

            generatedImageUrl = data.imageUrl;
            resultImg.src = data.imageUrl;
            result.style.display = 'block';
          }, 350);
        })
        .catch(function (err) {
          progressBar.style.animation = 'none';
          loading.style.display = 'none';
          showError(err.message || 'Une erreur est survenue');
          generateBtn.disabled = false;
        });
    });

    // Force download via blob — works for cross-origin images
    downloadBtn.addEventListener('click', function () {
      if (!generatedImageUrl) return;
      fetch(generatedImageUrl)
        .then(function (res) { return res.blob(); })
        .then(function (blob) {
          var blobUrl = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = blobUrl;
          a.download = 'hijab-tryon.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        })
        .catch(function () {
          // Fallback: open in new tab
          window.open(generatedImageUrl, '_blank');
        });
    });

    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }

    function hideError() {
      errorBox.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
