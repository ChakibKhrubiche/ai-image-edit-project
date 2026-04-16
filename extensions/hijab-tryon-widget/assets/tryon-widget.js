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
          '<div class="hijab-tryon-spinner"></div>' +
          '<p>Génération en cours… (~30 secondes)</p>' +
        '</div>' +
        '<div class="hijab-tryon-result" id="hijab-tryon-result">' +
          '<img id="hijab-tryon-result-img" alt="Résultat try-on" />' +
          '<a class="hijab-tryon-download" id="hijab-tryon-download" download="hijab-tryon.jpg">⬇ Télécharger</a>' +
        '</div>' +
        '<div class="hijab-tryon-error" id="hijab-tryon-error"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    var modal       = overlay.querySelector('.hijab-tryon-modal');
    var closeBtn    = overlay.querySelector('.hijab-tryon-close');
    var fileInput   = overlay.querySelector('#hijab-tryon-file');
    var preview     = overlay.querySelector('#hijab-tryon-preview');
    var generateBtn = overlay.querySelector('#hijab-tryon-generate');
    var loading     = overlay.querySelector('#hijab-tryon-loading');
    var result      = overlay.querySelector('#hijab-tryon-result');
    var resultImg   = overlay.querySelector('#hijab-tryon-result-img');
    var downloadBtn = overlay.querySelector('#hijab-tryon-download');
    var errorBox    = overlay.querySelector('#hijab-tryon-error');

    var customerPhotoBase64 = null;

    function closeModal() { document.body.removeChild(overlay); }

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
          loading.style.display = 'none';
          if (!data.success) throw new Error(data.error || 'Génération échouée');

          resultImg.src = data.imageUrl;
          downloadBtn.href = data.imageUrl;
          result.style.display = 'block';
        })
        .catch(function (err) {
          loading.style.display = 'none';
          showError(err.message || 'Une erreur est survenue');
          generateBtn.disabled = false;
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
