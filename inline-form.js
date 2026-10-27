// ============================================================ //
// INLINE ENQUIRY FORM — Name / Mobile / City
// ============================================================ //
(function () {
    const form = document.getElementById('inlineLeadForm');
    if (!form) return;

    const nameInput = document.getElementById('inlineName');
    const mobileInput = document.getElementById('inlineMobile');
    const cityInput = document.getElementById('inlineCity');
    const honeypot = document.getElementById('inlineHoneypot');
    const errorBox = document.getElementById('inlineFormError');
    const submitBtn = document.getElementById('inlineSubmitBtn');

    // Mobile number: digits only
    mobileInput.addEventListener('input', () => {
        mobileInput.value = mobileInput.value.replace(/\D/g, '').slice(0, 10);
    });

    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    function validate() {
        const name = nameInput.value.trim();
        const mobile = mobileInput.value.trim();
        const city = cityInput.value.trim();

        if (honeypot.value) return 'Invalid submission';
        if (name.length < 2) return 'कृपया अपना पूरा नाम दर्ज करें';
        if (!/^[6-9]\d{9}$/.test(mobile)) return 'कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें';
        if (city.length < 2) return 'कृपया अपना शहर दर्ज करें';
        return null;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.hidden = true;

        const validationError = validate();
        if (validationError) {
            showError(validationError);
            return;
        }

        const lead = {
            name: nameInput.value.trim(),
            mobile: mobileInput.value.trim(),
            city: cityInput.value.trim(),
            company: honeypot.value,
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'कृपया प्रतीक्षा करें...';

        try {
            await window.submitLead(lead, 'inline-form');
            window.location.href = 'thank-you.html?name=' + encodeURIComponent(lead.name);
        } catch (err) {
            showError(err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = '🛒 Enquire Now';
        }
    });
})();
