// Vision Forms Fix v2 - Formspree + UTM Tracking
// Fixes all broken form handlers, captures ad source, fires Pixel Lead event
(function() {
  const FORMSPREE_URL = 'https://formspree.io/f/maqkzzwq';

  // Capture UTM params from URL (Facebook passes these automatically)
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source:   params.get('utm_source')   || '',
      utm_medium:   params.get('utm_medium')   || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content:  params.get('utm_content')  || '',
      utm_term:     params.get('utm_term')     || '',
      fbclid:       params.get('fbclid')       || '',
      page_url:     window.location.href,
      page_title:   document.title.substring(0, 80),
      referrer:     document.referrer || 'direct'
    };
  }

  function fixForm(formId, pageLabel) {
    const form = document.getElementById(formId);
    if (!form) return;

    // Add UTM tracking fields
    const utm = getUTMParams();
    Object.entries(utm).forEach(([key, val]) => {
      if (!val) return;
      const inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = key;
      inp.value = val;
      form.appendChild(inp);
    });

    // Add submission timestamp
    const tsInput = document.createElement('input');
    tsInput.type = 'hidden';
    tsInput.name = 'submitted_at';
    tsInput.value = new Date().toLocaleString('en-US', {timeZone: 'America/New_York'});
    form.appendChild(tsInput);

    // Override submit - only if not already handled by inline JS
    if (form.dataset.visionFixed) return;
    form.dataset.visionFixed = '1';

    form.addEventListener('submit', async function(e) {
      // If form has inline handler (insuranceForm), let it run
      // formfix only takes over leadForm (luxury) which has broken handler
      if (formId === 'insuranceForm') return; // handled inline
      
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : '';
      if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

      try {
        const res = await fetch(FORMSPREE_URL, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          if (typeof fbq !== 'undefined') {
            fbq('track', 'Lead', {
              content_name: pageLabel || document.title,
              content_category: utm.utm_campaign || 'direct'
            });
          }
          // Show success
          form.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
              <div style="font-size:3rem;margin-bottom:16px;">✓</div>
              <h3 style="font-size:1.4rem;font-weight:700;margin-bottom:12px;">We Got Your Request!</h3>
              <p style="opacity:0.75;line-height:1.7;margin-bottom:20px;">Our team will call you within 1 hour.</p>
              <a href="tel:9543502622" style="display:inline-block;padding:12px 28px;background:#c9a84c;color:#0a0a14;font-weight:700;border-radius:6px;text-decoration:none;">(954) 350-2622</a>
            </div>`;
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        alert('Something went wrong. Please call (954) 350-2622 or email visionaluminumandglass@gmail.com');
      }
    }, { once: true });
  }

  document.addEventListener('DOMContentLoaded', function() {
    const label = document.title.substring(0, 60);
    fixForm('insuranceForm', label);
    fixForm('leadForm', label);
  });
})();
