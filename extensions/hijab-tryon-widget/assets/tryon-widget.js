(function () {
  'use strict';

  // Get or create a stable anonymous customer ID stored in localStorage
  function getCustomerId() {
    // Logged-in Shopify customer
    if (window.Shopify && window.Shopify.customerId) {
      return { id: String(window.Shopify.customerId), anonymous: false };
    }
    // Anonymous visitor — use localStorage UUID
    var key = 'hijab_tryon_uid';
    var uid = localStorage.getItem(key);
    if (!uid) {
      uid = 'anon-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
      localStorage.setItem(key, uid);
    }
    return { id: uid, anonymous: true };
  }

  function init() {
    var root = document.getElementById('hijab-tryon-root');
    if (!root) return;

    var shopDomain      = root.dataset.shop;
    var productImageUrl = root.dataset.productImage;
    var productId       = root.dataset.productId || 'unknown';
    var backendUrl      = (root.dataset.backendUrl || 'https://hijabtryon.com').replace(/\/$/, '');
    var buttonText      = root.dataset.buttonText || 'Essayer ce hijab';

    if (!shopDomain || !productImageUrl) return;

    var customer = getCustomerId();

    var btn = document.createElement('button');
    btn.className = 'hijab-tryon-btn';
    btn.textContent = '🪞 ' + buttonText;
    btn.addEventListener('click', function () {
      openModal(shopDomain, productImageUrl, productId, backendUrl, customer);
    });
    root.appendChild(btn);

    // Fetch credits on load to disable button early if none remain
    fetch(backendUrl + '/api/shopify/tryon/credits'
      + '?shop=' + encodeURIComponent(shopDomain)
      + '&customerId=' + encodeURIComponent(customer.id)
      + '&anonymous=' + customer.anonymous)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.allowed) {
          btn.disabled = true;
          btn.title = 'Aucun crédit restant';
        }
      })
      .catch(function () { /* non-blocking */ });
  }

  function openModal(shopDomain, productImageUrl, productId, backendUrl, customer) {
    var overlay = document.createElement('div');
    overlay.className = 'hijab-tryon-overlay';
    overlay.innerHTML =
      '<div class="hijab-tryon-modal">' +
        '<button class="hijab-tryon-close" aria-label="Fermer">&times;</button>' +
        '<h2>Essayer ce hijab</h2>' +
        '<p class="hijab-tryon-credits" id="hijab-tryon-credits" style="font-size:13px;color:#6b7280;margin:0 0 12px;text-align:right"></p>' +
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
          '<p class="hijab-tryon-loading-text">Génération en cours… <span id="hijab-tryon-pct">0%</span></p>' +
          '<div id="hijab-tryon-track" style="width:100%;height:14px;background:linear-gradient(to right,#7c3aed 0%,#e5e7eb 0%);border-radius:99px;margin-top:10px"></div>' +
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
    var progressBar = overlay.querySelector('#hijab-tryon-track');
    var result      = overlay.querySelector('#hijab-tryon-result');
    var resultImg   = overlay.querySelector('#hijab-tryon-result-img');
    var downloadBtn = overlay.querySelector('#hijab-tryon-download');
    var errorBox    = overlay.querySelector('#hijab-tryon-error');
    var creditsLabel = overlay.querySelector('#hijab-tryon-credits');

    var customerPhotoBase64 = null;
    var progressInterval = null;
    var progressValue = 0;
    var generatedImageUrl = null;
    var remainingCredits = null;
    var needsWatermark = false;

    function closeModal() {
      if (progressInterval) clearInterval(progressInterval);
      document.body.removeChild(overlay);
    }

    var pctLabel = overlay.querySelector('#hijab-tryon-pct');

    function setBarWidth(pct) {
      var p = pct.toFixed(1) + '%';
      progressBar.style.setProperty('background', 'linear-gradient(to right,#7c3aed ' + p + ',#e5e7eb ' + p + ')');
      if (pctLabel) pctLabel.textContent = Math.round(pct) + '%';
    }

    function startProgress() {
      progressValue = 0;
      setBarWidth(0);
      progressInterval = setInterval(function () {
        if (progressValue < 95) {
          progressValue = Math.min(progressValue + (Math.random() * 3), 95);
          setBarWidth(progressValue);
        }
      }, 500);
    }

    function completeProgress() {
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
      setBarWidth(100);
    }

    function updateCreditsLabel(n) {
      if (creditsLabel) {
        creditsLabel.textContent = n === 1
          ? '1 try-on restant'
          : n + ' try-ons restants';
        creditsLabel.style.color = n <= 1 ? '#ef4444' : '#6b7280';
      }
    }

    // Load credits on modal open
    fetch(backendUrl + '/api/shopify/tryon/credits'
      + '?shop=' + encodeURIComponent(shopDomain)
      + '&customerId=' + encodeURIComponent(customer.id)
      + '&anonymous=' + customer.anonymous)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        remainingCredits = data.credits;
        updateCreditsLabel(data.credits);
        if (!data.allowed) {
          generateBtn.disabled = true;
          showError('Vous n\'avez plus de crédits try-on disponibles.');
        }
      })
      .catch(function () { /* non-blocking */ });

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
        // Only enable generate if credits are available
        if (remainingCredits === null || remainingCredits > 0) {
          generateBtn.disabled = false;
        }
        hideError();
        result.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    generateBtn.addEventListener('click', function () {
      if (!customerPhotoBase64) return;

      // Re-check credits before generating
      if (remainingCredits !== null && remainingCredits <= 0) {
        showError('Vous n\'avez plus de crédits try-on disponibles.');
        return;
      }

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
            needsWatermark = !!data.watermark;

            if (needsWatermark) {
              applyWatermark(backendUrl, data.imageUrl, function (watermarkedDataUrl) {
                resultImg.src = watermarkedDataUrl;
                generatedImageUrl = watermarkedDataUrl; // download watermarked version
              });
            } else {
              resultImg.src = data.imageUrl;
            }
            result.style.display = 'block';

            // Deduct 1 credit after successful generation
            fetch(backendUrl + '/api/shopify/tryon/credits/deduct', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shop: shopDomain,
                customerId: customer.id,
                anonymous: customer.anonymous,
              }),
            })
              .then(function (r) { return r.json(); })
              .then(function (d) {
                if (typeof d.credits === 'number') {
                  remainingCredits = d.credits;
                  updateCreditsLabel(d.credits);
                  if (d.credits <= 0) {
                    generateBtn.disabled = true;
                  }
                }
              })
              .catch(function () { /* non-blocking */ });
          }, 350);
        })
        .catch(function (err) {
          if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
          loading.style.display = 'none';
          showError(err.message || 'Une erreur est survenue');
          generateBtn.disabled = false;
        });
    });

    // Force download via blob — handles both external URLs and data: URLs (watermarked)
    downloadBtn.addEventListener('click', function () {
      if (!generatedImageUrl) return;

      if (generatedImageUrl.startsWith('data:')) {
        // Already a data URL (watermarked canvas) — download directly
        var a = document.createElement('a');
        a.href = generatedImageUrl;
        a.download = 'hijab-tryon.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

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

  // Fetches imageUrl through our same-origin proxy then draws it on a canvas
  // with a "Essai gratuit • HijabTryOn.com" watermark.
  // Falls back to the raw URL if canvas/proxy fails (better than broken image).
  function applyWatermark(backendUrl, imageUrl, callback) {
    var proxyUrl = backendUrl + '/api/shopify/tryon/proxy?url=' + encodeURIComponent(imageUrl);
    var img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function () {
      try {
        var canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || img.width;
        canvas.height = img.naturalHeight || img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var w = canvas.width;
        var h = canvas.height;
        var fontSize = Math.max(16, Math.round(w / 22));

        // Semi-transparent bottom strip
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.fillRect(0, h - fontSize * 2.4, w, fontSize * 2.4);

        // Text
        ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.90)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Essai gratuit • HijabTryOn.com', w / 2, h - fontSize * 1.2);

        callback(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        // Canvas security error — fall back to raw image
        callback(imageUrl);
      }
    };

    img.onerror = function () {
      // Proxy unreachable — fall back to raw image
      callback(imageUrl);
    };

    img.src = proxyUrl;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
