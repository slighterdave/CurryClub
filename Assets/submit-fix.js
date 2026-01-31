(function() {
  // Keys in the same order the UI renders them
  const RATING_KEYS = ['food', 'service', 'choice', 'value', 'spiceLevel'];

  function getRatingsFromDOM() {
    const ratings = {};
    // form has a .space-y-5 container with children for each rating block
    const blocks = document.querySelectorAll('form .space-y-5 > div');
    for (let i = 0; i < RATING_KEYS.length; i++) {
      const key = RATING_KEYS[i];
      const block = blocks[i];
      if (!block) {
        ratings[key] = 0;
        continue;
      }
      // preferred: count SVGs with the selected class
      let value = block.querySelectorAll('button svg.fill-orange-500').length;
      // fallback: read the small span that shows "N/5"
      if (!value) {
        const span = block.querySelector('span.ml-2');
        if (span) {
          const txt = span.textContent.trim();
          if (txt && txt !== '-') {
            const n = parseInt(txt.split('/')[0], 10);
            if (!Number.isNaN(n)) value = n;
          }
        }
      }
      ratings[key] = value || 0;
    }
    return ratings;
  }

  async function submitToApi(payload) {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'same-origin'
    });
    return res;
  }

  function attachHandler() {
    const form = document.querySelector('form');
    if (!form) return false;

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      const nameInput = document.getElementById('restaurant-name');
      if (!nameInput) {
        alert('Restaurant name input not found');
        return;
      }
      const restaurant = nameInput.value.trim();
      if (!restaurant) {
        alert('Please enter a restaurant name');
        return;
      }

      const ratings = getRatingsFromDOM();
      for (const k of Object.keys(ratings)) {
        if (!ratings[k] || ratings[k] <= 0) {
          alert('Please select a value for all rating categories.');
          return;
        }
      }

      const payload = {
        restaurant,
        ratings,
        notes: '' // adapt if you add a notes input
      };

      try {
        const res = await submitToApi(payload);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error('submit failed', data);
          alert('Submit failed: ' + (data.error || res.status));
          return;
        }
        alert('Rating submitted.');
        // reload so the UI state resets and you can verify via API/DB
        window.location.reload();
      } catch (err) {
        console.error('network error', err);
        alert('Network error while submitting. Check console.');
      }
    }, { passive: false });

    return true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!attachHandler()) {
      // React may render after load; observe and attach when form appears
      const root = document.getElementById('root') || document.body;
      const obs = new MutationObserver(() => {
        if (attachHandler()) obs.disconnect();
      });
      obs.observe(root, { childList: true, subtree: true });
    }
  });
})();
