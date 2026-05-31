// Vision Forms Fix - Formspree Integration
// Fixes all broken form handlers across all landing pages
(function() {
  const FORMSPREE_URL = 'https://formspree.io/f/maqkzzwq';

  function fixForm(formId, pageLabel) {
    const form = document.getElementById(formId);
    if (!form) return;

    // Add hidden fields
    const addHidden = (name, value) => {
      const inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = name;
      inp.value = value;
      form.appendChild(inp);
    };

    addHidden('_cc', 'matan230595@gmail.com');
    addHidden('_subject', '🔔 New Lead — Vision Aluminum & Glass — ' + pageLabel);
    addHidden('source_page', window.location.href);

    // Override submit
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : '';
      if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

      // Add timestamp
      const ts = document.createElement('input');
      ts.type = 'hidden';
      ts.name = 'submitted_at';
      ts.value = new Date().toLocaleString('en-US', {timeZone: 'America/New_York'});
      form.appendChild(ts);

      try {
        const res = await fetch(FORMSPREE_URL, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          // Fire Meta Pixel Lead event
          if (typeof fbq !== 'undefined') {
            fbq('track', 'Lead', { content_name: pageLabel, content_category: 'lead' });
          }
          // Show success
          const wrapper = form.closest('.form-wrapper, .form-section, #consultation') || form.parentElement;
          const successHTML = `
            <div style="text-align:center;padding:48px 24px;max-width:500px;margin:0 auto;">
              <div style="font-size:3.5rem;margin-bottom:16px;">✓</div>
              <h3 style="font-size:1.6rem;font-weight:700;margin-bottom:12px;color:inherit;">We Got Your Request!</h3>
              <p style="opacity:0.75;line-height:1.7;margin-bottom:24px;">Our team will call you within 1 hour to follow up.<br>Questions in the meantime?</p>
              <a href="tel:9543502622" style="display:inline-block;padding:14px 32px;background:#00b894;color:#0a1628;font-weight:700;border-radius:8px;text-decoration:none;font-size:1rem;">(954) 350-2622</a>
            </div>`;
          form.innerHTML = successHTML;
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'padding:12px 16px;margin-top:12px;border-radius:8px;background:rgba(225,112,85,0.15);border:1px solid rgba(225,112,85,0.4);color:#e17055;font-size:0.9rem;';
        errDiv.textContent = 'Something went wrong. Please call us at (954) 350-2622 or email visionaluminumandglass@gmail.com';
        form.appendChild(errDiv);
      }
    }, { once: true });
  }

  // Fix all possible form IDs used across the landing pages
  document.addEventListener('DOMContentLoaded', function() {
    const pageLabel = document.title.substring(0, 60);
    fixForm('insuranceForm', pageLabel);
    fixForm('leadForm', pageLabel);
    fixForm('contactForm', pageLabel);
    fixForm('quoteForm', pageLabel);
  });
})();
