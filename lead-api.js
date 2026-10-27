// ============================================================ //
// LEAD API — single submit path for BOTH forms (popup modal +
// inline form). Leads go to one Google Sheet via the Apps Script
// webhook in scripts/google-sheet-webhook.gs
// ============================================================ //
(function () {
    // Apps Script web app (scripts/google-sheet-webhook.gs). Re-deploying a
    // NEW version keeps this URL; a brand-new deployment changes it.
    const LEAD_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbw0rLiYwc5poJisqtv0HBjS-KGqHeI0_POxGFvt4EsX0xmLQCP5gw42kbcVW_6wqlui/exec';

    // Only needed if you set SHARED_SECRET in the Apps Script. Keep '' otherwise.
    const LEAD_WEBHOOK_SECRET = '';

    /**
     * Sends a lead to the sheet.
     * @param {Object} lead - name, mobile, and whatever else the form has
     *                        (age/address from the modal, city from the
     *                        inline form). Blank fields are fine.
     * @param {string} formName - 'popup-modal' or 'inline-form'
     * @returns {Promise<void>} resolves on success, rejects with a
     *                          user-facing Hindi message on failure.
     */
    async function submitLead(lead, formName) {
        const payload = Object.assign({}, lead, {
            form: formName,
            source: '3a-piles-kit',
            page: location.pathname + location.search,
            secret: LEAD_WEBHOOK_SECRET,
        });

        let res;
        try {
            // text/plain avoids the CORS preflight that Apps Script rejects.
            res = await fetch(LEAD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                redirect: 'follow',
            });
        } catch (err) {
            // Fallback for strict mobile browsers / adblockers: mode 'no-cors' ensures POST reaches Apps Script
            try {
                await fetch(LEAD_WEBHOOK_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                });
                return;
            } catch (fallbackErr) {
                throw new Error('नेटवर्क में समस्या हुई, कृपया दोबारा प्रयास करें');
            }
        }

        let data = null;
        try {
            data = JSON.parse(await res.text());
        } catch (err) {
            // Response unreadable (opaque/redirected). The POST itself went
            // through, so treat it as submitted rather than losing the lead.
            return;
        }

        if (!data || data.ok !== true) {
            throw new Error((data && data.error) || 'कुछ समस्या हुई, कृपया दोबारा प्रयास करें');
        }
    }

    window.submitLead = submitLead;
})();
