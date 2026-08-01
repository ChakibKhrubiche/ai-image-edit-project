(function () {
  'use strict';

  // Prevent double initialization: the <script> tag lives inside the app block,
  // so if the block is present more than once on the page the script loads
  // multiple times. Without this guard each load would append another button.
  if (window.__hijabTryonInitialized) return;
  window.__hijabTryonInitialized = true;

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
    var buttonText      = root.dataset.buttonText || 'Try it on';

    if (!shopDomain || !productImageUrl) return;

    var customer = getCustomerId();

    var btn = document.createElement('button');
    btn.className = 'hijab-tryon-btn';
    btn.textContent = buttonText;
    btn.addEventListener('click', function () {
      openModal(shopDomain, productImageUrl, productId, backendUrl, customer);
    });

    // Place the button directly after the theme's Buy buttons when possible,
    // otherwise fall back to the app block's own location.
    var buyButtons =
      document.querySelector('.product-form__buttons') ||
      document.querySelector('form[action*="/cart/add"]');
    if (buyButtons && buyButtons.parentNode) {
      buyButtons.parentNode.insertBefore(btn, buyButtons.nextSibling);
    } else {
      root.appendChild(btn);
    }

    // Fetch credits on load to disable button early if none remain
    fetch(backendUrl + '/api/shopify/tryon/credits'
      + '?shop=' + encodeURIComponent(shopDomain)
      + '&customerId=' + encodeURIComponent(customer.id)
      + '&anonymous=' + customer.anonymous)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.allowed) {
          btn.disabled = true;
          btn.title = 'No credits remaining';
        }
      })
      .catch(function () { /* non-blocking */ });
  }

  function openModal(shopDomain, productImageUrl, productId, backendUrl, customer) {
    var overlay = document.createElement('div');
    overlay.className = 'hijab-tryon-overlay';
    overlay.innerHTML =
      '<div class="hijab-tryon-modal">' +
        '<button class="hijab-tryon-close" aria-label="Close">&times;</button>' +
        '<h2>See it on you</h2>' +
        '<p class="hijab-tryon-credits" id="hijab-tryon-credits" style="font-size:13px;color:#6b7280;margin:0 0 12px;text-align:right"></p>' +
        '<div class="hijab-tryon-upload">' +
          '<label class="hijab-tryon-upload-label">' +
            '<span class="hijab-tryon-upload-icon">📷</span>' +
            '<span>Choose my photo</span>' +
            '<small>JPG, PNG — max 10 MB</small>' +
            '<input type="file" id="hijab-tryon-file" accept="image/jpeg,image/png,image/webp" />' +
          '</label>' +
          '<img class="hijab-tryon-preview" id="hijab-tryon-preview" alt="Preview" />' +
        '</div>' +
        '<button class="hijab-tryon-generate" id="hijab-tryon-generate" disabled>Generate try-on</button>' +
        '<div class="hijab-tryon-loading" id="hijab-tryon-loading">' +
          '<p class="hijab-tryon-loading-text">Generating… <span id="hijab-tryon-pct">0%</span></p>' +
          '<div id="hijab-tryon-track" style="width:100%;height:14px;background:linear-gradient(to right,#7c3aed 0%,#e5e7eb 0%);border-radius:99px;margin-top:10px"></div>' +
        '</div>' +
        '<div class="hijab-tryon-result" id="hijab-tryon-result">' +
          '<img id="hijab-tryon-result-img" alt="Try-on result" />' +
          '<div class="hijab-tryon-actions">' +
            '<button class="hijab-tryon-download" id="hijab-tryon-download">⬇ Download</button>' +
            '<button class="hijab-tryon-share" id="hijab-tryon-share">↗ Share</button>' +
          '</div>' +
          '<div class="hijab-tryon-share-menu" id="hijab-tryon-share-menu" style="display:none"></div>' +
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
    var shareBtn    = overlay.querySelector('#hijab-tryon-share');
    var shareMenu   = overlay.querySelector('#hijab-tryon-share-menu');
    var errorBox    = overlay.querySelector('#hijab-tryon-error');
    var creditsLabel = overlay.querySelector('#hijab-tryon-credits');

    var customerPhotoBase64 = null;
    var progressInterval = null;
    var progressValue = 0;
    var generatedImageUrl = null;
    var remainingCredits = null;
    var needsWatermark = false;
    var brandName = null; // store branding shown on the photo (null = disabled)

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
          ? '1 try-on left'
          : n + ' try-ons left';
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
          showError('You have no more try-on credits available.');
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
        showError('You have no more try-on credits available.');
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
            if (!data.success) throw new Error(data.error || 'Generation failed');

            generatedImageUrl = data.imageUrl;
            needsWatermark = !!data.watermark;
            var branding = data.branding || {};
            brandName = (branding.enabled && branding.name) ? String(branding.name) : null;

            // Compose the trial watermark and/or store branding onto the photo.
            if (needsWatermark || brandName) {
              finalizeImage(backendUrl, data.imageUrl, { watermark: needsWatermark, brandName: brandName }, function (finalDataUrl) {
                resultImg.src = finalDataUrl;
                generatedImageUrl = finalDataUrl; // download/share the branded version
              });
            } else {
              resultImg.src = data.imageUrl;
            }
            result.style.display = 'block';
            if (shareMenu) { shareMenu.style.display = 'none'; shareMenu.innerHTML = ''; }

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
          showError(err.message || 'An error occurred');
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

    // Share the generated (branded) photo.
    // Mobile: native Web Share with the actual image file. Desktop / unsupported:
    // reveal social buttons that share the store link (image can be downloaded).
    shareBtn.addEventListener('click', function () {
      if (!generatedImageUrl) return;
      var shareText = brandName
        ? ('My virtual try-on from ' + brandName + ' ✨')
        : 'Check out my virtual try-on ✨';
      var pageUrl = window.location.href;

      getShareBlob(backendUrl, generatedImageUrl, function (blob) {
        if (blob && navigator.canShare) {
          try {
            var file = new File([blob], 'tryon.jpg', { type: 'image/jpeg' });
            if (navigator.canShare({ files: [file] })) {
              navigator
                .share({ files: [file], title: shareText, text: shareText })
                .catch(function () { /* user cancelled */ });
              return;
            }
          } catch (e) { /* fall through to desktop fallback */ }
        }
        openShareFallback(shareMenu, pageUrl, shareText, generatedImageUrl);
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

  // Loads imageUrl through our same-origin proxy and composites optional overlays
  // onto a canvas: the store branding badge (top-left) and/or the trial watermark
  // strip (bottom). Returns a data URL. Falls back to the raw URL if canvas/proxy
  // fails (better a clean image than a broken one).
  function finalizeImage(backendUrl, imageUrl, opts, callback) {
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

        // Store branding badge (top-left pill)
        if (opts.brandName) {
          drawBrandBadge(ctx, w, opts.brandName);
        }

        // Trial watermark strip (bottom, full width)
        if (opts.watermark) {
          var fontSize = Math.max(16, Math.round(w / 22));
          ctx.fillStyle = 'rgba(0,0,0,0.30)';
          ctx.fillRect(0, h - fontSize * 2.4, w, fontSize * 2.4);
          ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.90)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('HijabTryOn.com', w / 2, h - fontSize * 1.2);
        }

        callback(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        callback(imageUrl); // canvas tainted / security error
      }
    };

    img.onerror = function () { callback(imageUrl); };
    img.src = proxyUrl;
  }

  // Draws a rounded white "brand name" pill in the top-left corner.
  function drawBrandBadge(ctx, w, name) {
    var pad = Math.round(w * 0.03);
    var fontSize = Math.max(18, Math.round(w / 26));
    ctx.font = '600 ' + fontSize + 'px Arial, sans-serif';
    var text = String(name);
    var padX = fontSize * 0.7;
    var padY = fontSize * 0.5;
    var boxW = ctx.measureText(text).width + padX * 2;
    var boxH = fontSize + padY * 2;
    var x = pad;
    var y = pad;
    var r = boxH / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = Math.round(fontSize * 0.4);
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRectPath(ctx, x, y, boxW, boxH, r);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX, y + boxH / 2 + 1);
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Returns a Blob for the generated image (data URL → decode, raw URL → proxy fetch).
  function getShareBlob(backendUrl, urlOrData, cb) {
    if (urlOrData.indexOf('data:') === 0) {
      try { cb(dataURLToBlob(urlOrData)); } catch (e) { cb(null); }
      return;
    }
    fetch(backendUrl + '/api/shopify/tryon/proxy?url=' + encodeURIComponent(urlOrData))
      .then(function (r) { return r.blob(); })
      .then(function (b) { cb(b); })
      .catch(function () { cb(null); });
  }

  function dataURLToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // Desktop / no-file-share fallback: show social buttons that share the store link.
  function openShareFallback(menu, pageUrl, text, imageUrl) {
    if (!menu) return;
    var enc = encodeURIComponent;
    var pinMedia = (imageUrl && imageUrl.indexOf('data:') !== 0) ? ('&media=' + enc(imageUrl)) : '';
    var links = [
      { label: 'Facebook', url: 'https://www.facebook.com/sharer/sharer.php?u=' + enc(pageUrl) },
      { label: 'X', url: 'https://twitter.com/intent/tweet?text=' + enc(text) + '&url=' + enc(pageUrl) },
      { label: 'WhatsApp', url: 'https://wa.me/?text=' + enc(text + ' ' + pageUrl) },
      { label: 'Pinterest', url: 'https://pinterest.com/pin/create/button/?url=' + enc(pageUrl) + '&description=' + enc(text) + pinMedia }
    ];

    menu.innerHTML = '';
    var hint = document.createElement('p');
    hint.className = 'hijab-tryon-share-hint';
    hint.textContent = 'Download the photo above to post it, or share your store:';
    menu.appendChild(hint);

    var row = document.createElement('div');
    row.className = 'hijab-tryon-share-row';
    links.forEach(function (l) {
      var b = document.createElement('button');
      b.className = 'hijab-tryon-share-net';
      b.textContent = l.label;
      b.addEventListener('click', function () { window.open(l.url, '_blank', 'noopener'); });
      row.appendChild(b);
    });
    menu.appendChild(row);
    menu.style.display = 'block';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
