// ============================================================ //
// ORDER FORM MODAL — lead capture + WhatsApp OTP verification
// ============================================================ //
(function () {
    const overlay = document.getElementById('orderModalOverlay');
    const closeBtn = document.getElementById('orderModalClose');
    const stepForm = document.getElementById('stepForm');
    const stepOtp = document.getElementById('stepOtp');
    const loading = document.getElementById('modalLoading');

    const leadForm = document.getElementById('leadForm');
    const leadName = document.getElementById('leadName');
    const leadMobile = document.getElementById('leadMobile');
    const leadAge = document.getElementById('leadAge');
    const leadAddress = document.getElementById('leadAddress');
    const leadHoneypot = document.getElementById('leadHoneypot');
    const formError = document.getElementById('formError');

    const otpForm = document.getElementById('otpForm');
    const otpInput = document.getElementById('otpInput');
    const otpError = document.getElementById('otpError');
    const otpMobileDisplay = document.getElementById('otpMobileDisplay');
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    const resendTimer = document.getElementById('resendTimer');
    const backToFormBtn = document.getElementById('backToFormBtn');

    let currentToken = null;
    let currentLead = null;
    let resendInterval = null;

    function showStep(step) {
        stepForm.hidden = step !== 'form';
        stepOtp.hidden = step !== 'otp';
        loading.hidden = true;
    }

    function showLoading(show) {
        loading.hidden = !show;
        stepForm.hidden = show || stepForm.hidden;
        stepOtp.hidden = show || stepOtp.hidden;
    }

    function openModal() {
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
        showStep('form');
        formError.hidden = true;
        otpError.hidden = true;
        leadForm.reset();
        otpForm.reset();
        stopResendTimer();
    }

    function closeModal() {
        overlay.hidden = true;
        document.body.style.overflow = '';
        stopResendTimer();
    }

    function showError(el, message) {
        el.textContent = message;
        el.hidden = false;
    }

    function hideError(el) {
        el.hidden = true;
    }

    function validateLead() {
        const name = leadName.value.trim();
        const mobile = leadMobile.value.trim();
        const age = Number(leadAge.value);

        if (leadHoneypot.value) return 'Invalid submission';
        if (name.length < 2) return 'कृपया अपना पूरा नाम दर्ज करें';
        if (!/^[6-9]\d{9}$/.test(mobile)) return 'कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें';
        if (!age || age < 1 || age > 120) return 'कृपया सही उम्र दर्ज करें';
        return null;
    }

    function startResendTimer() {
        let seconds = 60;
        resendOtpBtn.disabled = true;
        resendTimer.textContent = seconds;
        resendInterval = setInterval(() => {
            seconds -= 1;
            resendTimer.textContent = seconds;
            if (seconds <= 0) {
                stopResendTimer();
                resendOtpBtn.disabled = false;
                resendOtpBtn.textContent = 'OTP दोबारा भेजें';
            }
        }, 1000);
    }

    function stopResendTimer() {
        if (resendInterval) {
            clearInterval(resendInterval);
            resendInterval = null;
        }
    }

    async function sendOtp(lead) {
        const res = await fetch('/api/send-otp.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'OTP भेजने में समस्या हुई, कृपया दोबारा प्रयास करें');
        return data;
    }

    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(formError);

        const validationError = validateLead();
        if (validationError) {
            showError(formError, validationError);
            return;
        }

        currentLead = {
            name: leadName.value.trim(),
            mobile: leadMobile.value.trim(),
            age: leadAge.value.trim(),
            address: leadAddress.value.trim(),
            company: leadHoneypot.value,
        };

        showLoading(true);
        try {
            const data = await sendOtp(currentLead);
            currentToken = data.token;
            otpMobileDisplay.textContent = currentLead.mobile;
            otpInput.value = '';
            hideError(otpError);
            resendOtpBtn.textContent = 'OTP दोबारा भेजें';
            showStep('otp');
            startResendTimer();
        } catch (err) {
            showStep('form');
            showError(formError, err.message);
        }
    });

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(otpError);

        const otp = otpInput.value.trim();
        if (!/^\d{6}$/.test(otp)) {
            showError(otpError, 'कृपया 6 अंकों का सही OTP दर्ज करें');
            return;
        }

        showLoading(true);
        try {
            const res = await fetch('/api/verify-otp.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: currentLead.mobile, otp, token: currentToken }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (data.token) currentToken = data.token;
                showStep('otp');
                showError(otpError, data.error || 'OTP गलत है, कृपया दोबारा प्रयास करें');
                return;
            }

            window.location.href = `thank-you.html?name=${encodeURIComponent(currentLead.name)}`;
        } catch (err) {
            showStep('otp');
            showError(otpError, 'नेटवर्क में समस्या हुई, कृपया दोबारा प्रयास करें');
        }
    });

    resendOtpBtn.addEventListener('click', async () => {
        if (resendOtpBtn.disabled || !currentLead) return;
        hideError(otpError);
        showLoading(true);
        try {
            const data = await sendOtp(currentLead);
            currentToken = data.token;
            otpInput.value = '';
            showStep('otp');
            resendOtpBtn.textContent = 'OTP दोबारा भेजें';
            startResendTimer();
        } catch (err) {
            showStep('otp');
            showError(otpError, err.message);
        }
    });

    backToFormBtn.addEventListener('click', () => {
        stopResendTimer();
        showStep('form');
    });

    document.querySelectorAll('.js-order-btn').forEach((btn) => {
        btn.addEventListener('click', openModal);
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });
})();
