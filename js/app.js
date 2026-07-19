(function () {
  'use strict';

  var STORAGE_KEY = 'afterworkFormData';
  var EVENT_TITLE = (window.APP_CONFIG && window.APP_CONFIG.eventTitle) || 'AFTERWORK by Heineken';

  var state = {
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    organization: '',
    bringPlusOne: '',
    plusOneName: '',
    plusOneEmail: '',
    plusOnePhoneNumber: '',
    plusOneDateOfBirth: '',
    plusOneOrganization: '',
    interest: '',
    termsAgreed: false
  };

  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        state = Object.assign(state, parsed);
      }
    } catch (e) {
      /* localStorage unavailable (e.g. file:// restrictions) - continue with in-memory state */
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore persistence failure */
    }
  }

  function goToPage(pageNumber) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + pageNumber);
    if (target) {
      target.classList.add('active');
    }

    window.scrollTo(0, 0);
  }

  function hydrateFormFromState() {
    document.getElementById('input-name').value = state.name || '';
    document.getElementById('input-email').value = state.email || '';
    document.getElementById('input-phone').value = state.phoneNumber || '';
    dobGroup.setValue(state.dateOfBirth || '');
    document.getElementById('input-org').value = state.organization || '';

    var plusOneRadios = document.querySelectorAll('input[name="plusOne"]');
    plusOneRadios.forEach(function (radio) {
      radio.checked = radio.value === state.bringPlusOne;
    });

    document.getElementById('input-plusone-name').value = state.plusOneName || '';
    document.getElementById('input-plusone-email').value = state.plusOneEmail || '';
    document.getElementById('input-plusone-phone').value = state.plusOnePhoneNumber || '';
    plusOneDobGroup.setValue(state.plusOneDateOfBirth || '');
    document.getElementById('input-plusone-org').value = state.plusOneOrganization || '';
    togglePlusOneFields(state.bringPlusOne === 'Yes');

    document.getElementById('interest-business').checked = state.interest === 'Business connections & chat';
    document.getElementById('interest-fresh').checked = state.interest === 'Fresh connections & chill';

    // Terms agreement is intentionally not restored: the guest must reopen and
    // re-view the Terms and Conditions each time before the checkbox unlocks.
  }

  function clearFieldError(inputEl, errorEl) {
    inputEl.classList.remove('field-error');
    errorEl.classList.remove('visible');
  }

  function showFieldError(inputEl, errorEl) {
    inputEl.classList.add('field-error');
    errorEl.classList.add('visible');
  }

  function togglePlusOneFields(show) {
    var container = document.getElementById('plus-one-fields');
    container.classList.toggle('visible', show);
    if (!show) {
      ['input-plusone-name', 'input-plusone-email', 'input-plusone-phone', 'input-plusone-org'].forEach(function (id) {
        var el = document.getElementById(id);
        clearFieldError(el, document.getElementById('err-' + id.replace('input-', '')));
      });
      clearFieldError(document.getElementById('dob-select-row-plusone'), document.getElementById('err-plusone-dob'));
    }
    if (typeof page2ScrollUpdate === 'function') {
      page2ScrollUpdate();
    }
  }

  // Drives a custom track+thumb scroll indicator next to a .form-scroll,
  // since mobile browsers generally hide native scrollbars regardless of CSS
  // styling. Returns an update() function to call whenever the scrollable
  // content's height changes (e.g. the Plus One fields appearing).
  function setupScrollIndicator(scrollEl, indicatorEl) {
    var thumb = indicatorEl.querySelector('.scroll-thumb');

    function update() {
      var scrollHeight = scrollEl.scrollHeight;
      var clientHeight = scrollEl.clientHeight;
      if (scrollHeight <= clientHeight + 1) {
        indicatorEl.classList.add('hidden');
        return;
      }
      indicatorEl.classList.remove('hidden');
      var trackHeight = indicatorEl.clientHeight;
      var thumbHeight = Math.max(trackHeight * (clientHeight / scrollHeight), 24);
      var maxThumbTop = trackHeight - thumbHeight;
      var scrollableDistance = scrollHeight - clientHeight;
      var scrollRatio = scrollableDistance > 0 ? scrollEl.scrollTop / scrollableDistance : 0;
      thumb.style.height = thumbHeight + 'px';
      thumb.style.top = (maxThumbTop * scrollRatio) + 'px';
    }

    scrollEl.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
    return update;
  }

  function filterPhoneInput(e) {
    var cursorPos = e.target.selectionStart;
    var original = e.target.value;
    var filtered = original.replace(/[^0-9+\-\s]/g, '');
    if (filtered !== original) {
      e.target.value = filtered;
      var diff = original.length - filtered.length;
      e.target.setSelectionRange(cursorPos - diff, cursorPos - diff);
    }
  }

  function isValidPhone(value) {
    var digitsOnly = value.replace(/[^0-9]/g, '');
    return !!value && digitsOnly.length >= 7 && /^[0-9+\-\s]+$/.test(value);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function populateDaySelect(select, dayCount) {
    var currentValue = select.value;
    while (select.options.length > 1) {
      select.remove(1);
    }
    for (var d = 1; d <= dayCount; d++) {
      var opt = document.createElement('option');
      opt.value = pad2(d);
      opt.textContent = pad2(d);
      select.appendChild(opt);
    }
    if (currentValue && Number(currentValue) <= dayCount) {
      select.value = currentValue;
    }
  }

  // Wires up a Day/Month/Year select trio that scrolls natively (desktop dropdown,
  // mobile wheel picker) instead of the fiddly native <input type="date"> calendar.
  // Keeps a hidden input in sync so the rest of the validation code (which reads
  // a single 'YYYY-MM-DD' value) doesn't need to change.
  function setupDobSelectGroup(dayId, monthId, yearId, hiddenId) {
    var daySelect = document.getElementById(dayId);
    var monthSelect = document.getElementById(monthId);
    var yearSelect = document.getElementById(yearId);
    var hiddenInput = document.getElementById(hiddenId);

    MONTH_NAMES.forEach(function (name, index) {
      var opt = document.createElement('option');
      opt.value = pad2(index + 1);
      opt.textContent = name;
      monthSelect.appendChild(opt);
    });

    var currentYear = new Date().getFullYear();
    for (var y = currentYear; y >= currentYear - 100; y--) {
      var opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    }

    populateDaySelect(daySelect, 31);

    function refreshDayCount() {
      if (monthSelect.value && yearSelect.value) {
        var daysInMonth = new Date(Number(yearSelect.value), Number(monthSelect.value), 0).getDate();
        populateDaySelect(daySelect, daysInMonth);
      } else {
        populateDaySelect(daySelect, 31);
      }
    }

    function syncHiddenValue() {
      if (daySelect.value && monthSelect.value && yearSelect.value) {
        hiddenInput.value = yearSelect.value + '-' + monthSelect.value + '-' + daySelect.value;
      } else {
        hiddenInput.value = '';
      }
      hiddenInput.dispatchEvent(new Event('change'));
    }

    daySelect.addEventListener('change', syncHiddenValue);
    monthSelect.addEventListener('change', function () {
      refreshDayCount();
      syncHiddenValue();
    });
    yearSelect.addEventListener('change', function () {
      refreshDayCount();
      syncHiddenValue();
    });

    return {
      setValue: function (isoDate) {
        if (!isoDate) {
          daySelect.value = '';
          monthSelect.value = '';
          yearSelect.value = '';
          hiddenInput.value = '';
          return;
        }
        var parts = isoDate.split('-');
        yearSelect.value = parts[0] || '';
        monthSelect.value = parts[1] || '';
        refreshDayCount();
        daySelect.value = parts[2] || '';
        hiddenInput.value = isoDate;
      }
    };
  }

  function isAtLeast18(dobValue) {
    var dob = new Date(dobValue);
    if (isNaN(dob.getTime())) {
      return false;
    }
    var today = new Date();
    var age = today.getFullYear() - dob.getFullYear();
    var monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 18;
  }

  /* ---------- Page 1 ---------- */

  document.getElementById('btn-register-now').addEventListener('click', function () {
    goToPage(2);
  });

  /* ---------- Page 2 ---------- */

  document.getElementById('btn-page2-back').addEventListener('click', function () {
    goToPage(1);
  });

  // Block letters/symbols as the user types; allow digits, spaces, + and - for country codes.
  document.getElementById('input-phone').addEventListener('input', filterPhoneInput);
  document.getElementById('input-plusone-phone').addEventListener('input', filterPhoneInput);

  var dobRow = document.getElementById('dob-select-row');
  var plusOneDobRow = document.getElementById('dob-select-row-plusone');
  var dobGroup = setupDobSelectGroup('dob-day', 'dob-month', 'dob-year', 'input-dob');
  var plusOneDobGroup = setupDobSelectGroup('dob-day-plusone', 'dob-month-plusone', 'dob-year-plusone', 'input-plusone-dob');
  var page2ScrollUpdate = setupScrollIndicator(
    document.getElementById('page2-form-scroll'),
    document.getElementById('page2-scroll-indicator')
  );

  // Clear the age error as soon as a valid 18+ date is picked, without waiting for Next.
  function watchDobForLiveClear(inputId, errorId, rowEl) {
    var input = document.getElementById(inputId);
    var error = document.getElementById(errorId);
    input.addEventListener('change', function () {
      if (input.value.trim() && isAtLeast18(input.value.trim())) {
        clearFieldError(rowEl, error);
      }
    });
  }
  watchDobForLiveClear('input-dob', 'err-dob', dobRow);
  watchDobForLiveClear('input-plusone-dob', 'err-plusone-dob', plusOneDobRow);

  document.querySelectorAll('input[name="plusOne"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      togglePlusOneFields(radio.value === 'Yes' && radio.checked);
    });
  });

  document.getElementById('btn-page2-next').addEventListener('click', function () {
    var nameInput = document.getElementById('input-name');
    var emailInput = document.getElementById('input-email');
    var phoneInput = document.getElementById('input-phone');
    var dobInput = document.getElementById('input-dob');
    var orgInput = document.getElementById('input-org');

    var errName = document.getElementById('err-name');
    var errEmail = document.getElementById('err-email');
    var errPhone = document.getElementById('err-phone');
    var errDob = document.getElementById('err-dob');
    var errOrg = document.getElementById('err-org');
    var banner = document.getElementById('page2-validation');

    var checkedPlusOne = document.querySelector('input[name="plusOne"]:checked');
    var bringingPlusOne = checkedPlusOne && checkedPlusOne.value === 'Yes';

    var plusOneNameInput = document.getElementById('input-plusone-name');
    var plusOneEmailInput = document.getElementById('input-plusone-email');
    var plusOnePhoneInput = document.getElementById('input-plusone-phone');
    var plusOneDobInput = document.getElementById('input-plusone-dob');
    var plusOneOrgInput = document.getElementById('input-plusone-org');

    var errPlusOneName = document.getElementById('err-plusone-name');
    var errPlusOneEmail = document.getElementById('err-plusone-email');
    var errPlusOnePhone = document.getElementById('err-plusone-phone');
    var errPlusOneDob = document.getElementById('err-plusone-dob');
    var errPlusOneOrg = document.getElementById('err-plusone-org');

    var isValid = true;

    [
      [nameInput, errName],
      [emailInput, errEmail],
      [phoneInput, errPhone],
      [dobRow, errDob],
      [orgInput, errOrg],
      [plusOneNameInput, errPlusOneName],
      [plusOneEmailInput, errPlusOneEmail],
      [plusOnePhoneInput, errPlusOnePhone],
      [plusOneDobRow, errPlusOneDob],
      [plusOneOrgInput, errPlusOneOrg]
    ].forEach(function (pair) {
      clearFieldError(pair[0], pair[1]);
    });

    if (!nameInput.value.trim()) {
      showFieldError(nameInput, errName);
      isValid = false;
    }

    var emailValue = emailInput.value.trim();
    if (!emailValue) {
      errEmail.textContent = 'Mail is required.';
      showFieldError(emailInput, errEmail);
      isValid = false;
    } else if (!isValidEmail(emailValue)) {
      errEmail.textContent = 'Please enter a valid email address.';
      showFieldError(emailInput, errEmail);
      isValid = false;
    }

    var phoneValue = phoneInput.value.trim();
    if (!phoneValue) {
      errPhone.textContent = 'Phone Number is required.';
      showFieldError(phoneInput, errPhone);
      isValid = false;
    } else if (!isValidPhone(phoneValue)) {
      errPhone.textContent = 'Please enter a valid phone number (numbers only).';
      showFieldError(phoneInput, errPhone);
      isValid = false;
    }

    var dobValue = dobInput.value.trim();
    if (!dobValue) {
      errDob.textContent = 'Date of Birth is required.';
      showFieldError(dobRow, errDob);
      isValid = false;
    } else if (!isAtLeast18(dobValue)) {
      errDob.textContent = 'You must be at least 18 years old to register.';
      showFieldError(dobRow, errDob);
      isValid = false;
    }
    if (!orgInput.value.trim()) {
      showFieldError(orgInput, errOrg);
      isValid = false;
    }

    if (bringingPlusOne) {
      if (!plusOneNameInput.value.trim()) {
        showFieldError(plusOneNameInput, errPlusOneName);
        isValid = false;
      }

      var plusOneEmailValue = plusOneEmailInput.value.trim();
      if (!plusOneEmailValue) {
        errPlusOneEmail.textContent = "Plus One's Mail is required.";
        showFieldError(plusOneEmailInput, errPlusOneEmail);
        isValid = false;
      } else if (!isValidEmail(plusOneEmailValue)) {
        errPlusOneEmail.textContent = 'Please enter a valid email address.';
        showFieldError(plusOneEmailInput, errPlusOneEmail);
        isValid = false;
      }

      var plusOnePhoneValue = plusOnePhoneInput.value.trim();
      if (!plusOnePhoneValue) {
        errPlusOnePhone.textContent = "Plus One's Phone Number is required.";
        showFieldError(plusOnePhoneInput, errPlusOnePhone);
        isValid = false;
      } else if (!isValidPhone(plusOnePhoneValue)) {
        errPlusOnePhone.textContent = 'Please enter a valid phone number (numbers only).';
        showFieldError(plusOnePhoneInput, errPlusOnePhone);
        isValid = false;
      } else if (phoneValue && plusOnePhoneValue.replace(/[^0-9]/g, '') === phoneValue.replace(/[^0-9]/g, '')) {
        errPlusOnePhone.textContent = "Plus One's phone number must be different from yours.";
        showFieldError(plusOnePhoneInput, errPlusOnePhone);
        isValid = false;
      }

      var plusOneDobValue = plusOneDobInput.value.trim();
      if (!plusOneDobValue) {
        errPlusOneDob.textContent = "Plus One's Date of Birth is required.";
        showFieldError(plusOneDobRow, errPlusOneDob);
        isValid = false;
      } else if (!isAtLeast18(plusOneDobValue)) {
        errPlusOneDob.textContent = 'Plus One must be at least 18 years old.';
        showFieldError(plusOneDobRow, errPlusOneDob);
        isValid = false;
      }
      if (!plusOneOrgInput.value.trim()) {
        showFieldError(plusOneOrgInput, errPlusOneOrg);
        isValid = false;
      }
    }

    if (!isValid) {
      banner.classList.add('visible');
      return;
    }

    banner.classList.remove('visible');

    state.name = nameInput.value.trim();
    state.email = emailInput.value.trim();
    state.phoneNumber = phoneInput.value.trim();
    state.dateOfBirth = dobInput.value.trim();
    state.organization = orgInput.value.trim();
    state.bringPlusOne = checkedPlusOne ? checkedPlusOne.value : '';

    if (bringingPlusOne) {
      state.plusOneName = plusOneNameInput.value.trim();
      state.plusOneEmail = plusOneEmailInput.value.trim();
      state.plusOnePhoneNumber = plusOnePhoneInput.value.trim();
      state.plusOneDateOfBirth = plusOneDobInput.value.trim();
      state.plusOneOrganization = plusOneOrgInput.value.trim();
    } else {
      state.plusOneName = '';
      state.plusOneEmail = '';
      state.plusOnePhoneNumber = '';
      state.plusOneDateOfBirth = '';
      state.plusOneOrganization = '';
    }

    saveState();
    goToPage(3);
  });

  /* ---------- Page 3 ---------- */

  document.getElementById('btn-page3-back').addEventListener('click', function () {
    goToPage(2);
  });

  var interestBusiness = document.getElementById('interest-business');
  var interestFresh = document.getElementById('interest-fresh');
  var termsCheckbox = document.getElementById('terms-checkbox');
  var termsBlock = document.getElementById('terms-block');
  var termsHint = document.getElementById('terms-hint');
  var submitButton = document.getElementById('btn-page3-submit');
  var hasViewedTerms = false;

  function unlockTermsCheckbox() {
    hasViewedTerms = true;
    termsCheckbox.disabled = false;
    termsBlock.classList.remove('is-locked');
    termsHint.classList.add('hidden');
  }

  function updateSubmitButtonState() {
    var hasInterest = interestBusiness.checked || interestFresh.checked;
    submitButton.disabled = !(hasInterest && hasViewedTerms && termsCheckbox.checked);
  }

  // Only one interest can be selected at a time (behaves like a single-choice selection).
  interestBusiness.addEventListener('change', function () {
    if (interestBusiness.checked) {
      interestFresh.checked = false;
    }
    updateSubmitButtonState();
  });
  interestFresh.addEventListener('change', function () {
    if (interestFresh.checked) {
      interestBusiness.checked = false;
    }
    updateSubmitButtonState();
  });
  termsCheckbox.addEventListener('change', updateSubmitButtonState);

  document.getElementById('link-terms').addEventListener('click', function (e) {
    e.preventDefault();
    unlockTermsCheckbox();
    goToPage(4);
  });

  var TERMS_VALIDATION_MSG = 'Please agree to the Terms and Conditions to continue.';
  var TERMS_NOT_VIEWED_MSG = 'Please open and read the Terms and Conditions first.';

  document.getElementById('btn-page3-submit').addEventListener('click', function () {
    var banner = document.getElementById('page3-validation');
    banner.textContent = TERMS_VALIDATION_MSG;

    var selectedInterest = interestBusiness.checked
      ? interestBusiness.value
      : (interestFresh.checked ? interestFresh.value : '');

    if (!hasViewedTerms) {
      banner.textContent = TERMS_NOT_VIEWED_MSG;
      banner.classList.add('visible');
      return;
    }

    if (!selectedInterest || !termsCheckbox.checked) {
      banner.classList.add('visible');
      return;
    }

    banner.classList.remove('visible');

    state.interest = selectedInterest;
    state.termsAgreed = termsCheckbox.checked;
    saveState();

    submitRegistration(banner);
  });

  async function submitRegistration(banner) {
    submitButton.disabled = true;
    var originalContent = submitButton.innerHTML;
    submitButton.textContent = 'Submitting...';

    try {
      var response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ eventName: EVENT_TITLE }, state))
      });

      if (!response.ok) {
        var errorData = await response.json().catch(function () { return {}; });
        throw new Error(errorData.error || 'Something went wrong. Please try again.');
      }

      document.getElementById('success-name').textContent = state.name || 'Guest';
      goToPage(5);
    } catch (err) {
      banner.textContent = err.message || 'Something went wrong. Please try again.';
      banner.classList.add('visible');
    } finally {
      submitButton.innerHTML = originalContent;
      updateSubmitButtonState();
    }
  }

  /* ---------- Page 4 ---------- */

  document.getElementById('btn-page4-back').addEventListener('click', function () {
    goToPage(3);
  });

  /* ---------- Page 5 ---------- */

  document.getElementById('btn-share').addEventListener('click', function () {
    shareToStory();
  });

  document.getElementById('btn-modal-close').addEventListener('click', function () {
    document.getElementById('share-modal').classList.remove('visible');
  });

  // Renders the actual live Page 5 poster to a PNG blob — exactly what the guest
  // sees on screen, with only the Share button removed. Never includes a link,
  // since this invitation is private.
  async function generatePosterImageBlob() {
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas not available');
    }
    var posterShell = document.querySelector('.poster-shell');

    // Wait for the brush/body web fonts to finish loading; capturing before they
    // are ready renders text in a fallback font or too faintly.
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) { /* proceed anyway */ }
    }

    // No useCORS here: our background images are same-origin, so a normal
    // (non-CORS-mode) fetch works. Forcing useCORS made html2canvas re-fetch
    // them in CORS mode, which fails silently against static hosting that
    // doesn't send CORS headers for those files — the actual cause of the
    // washed-out/failed captures.
    var canvas = await html2canvas(posterShell, {
      backgroundColor: '#0d2f10',
      scale: 3,
      onclone: function (clonedDoc) {
        // The page fade-in animation restarts inside html2canvas's cloned
        // document and can be snapshotted mid-fade — which is what made the
        // captured text look dimmed. Force everything to its final, fully
        // opaque state, and hide only the Share button (in the clone, so the
        // real page never flickers). The "take a screenshot" rewards hint is an
        // on-screen instruction to the guest, so it is hidden from the image too.
        var style = clonedDoc.createElement('style');
        style.textContent =
          '*{animation:none !important;transition:none !important;}' +
          '.page,.page.active{opacity:1 !important;transform:none !important;}' +
          '#btn-share,.share-hint{visibility:hidden !important;}';
        clonedDoc.head.appendChild(style);
      }
    });

    return await new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not generate image'));
        }
      }, 'image/png');
    });
  }

  async function shareToStory() {
    var shareText = "I'm officially on the A-list for Afterwork by Heineken.";
    var fileName = 'afterwork-invite.png';
    var blob = null;

    try {
      blob = await generatePosterImageBlob();
    } catch (err) {
      console.error('Failed to generate share image:', err);
    }

    // If the image itself couldn't be rendered, the only thing left is to ask
    // the guest to screenshot the page manually.
    if (!blob) {
      showShareFallback('screenshot');
      return;
    }

    var file = new File([blob], fileName, { type: 'image/png' });

    // 1) Preferred path — the OS native share sheet (mobile + share-capable
    //    desktops). This is what lets the guest send the image straight into
    //    Instagram, Facebook, Telegram, Teams, Mail, etc. in one step.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'AFTERWORK by Heineken',
          text: shareText
        });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return; // guest deliberately dismissed the share sheet
        }
        // Anything else (permission/hardware error) — fall through to download.
        console.error('Native share failed, falling back to download:', err);
      }
    }

    // 2) Universal fallback — hand the guest the real PNG so they can put it into
    //    any app on any platform (Windows/Mac/anywhere the native share sheet
    //    isn't available). We do BOTH: copy the image to the clipboard (great for
    //    pasting straight into Teams/Telegram/email on desktop) and download the
    //    file (for uploading to Facebook/Instagram or if clipboard isn't allowed).
    var copied = await copyImageToClipboard(blob);
    downloadImage(blob, fileName);
    showShareFallback(copied ? 'downloaded-copied' : 'downloaded');
  }

  // Copies the PNG to the system clipboard where supported (desktop Chrome/Edge/
  // Safari). Returns true on success, false if unsupported or blocked.
  async function copyImageToClipboard(blob) {
    try {
      if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
      }
    } catch (err) {
      // e.g. "Document is not focused" or permission denied — not fatal, we still
      // download the file below.
      console.error('Copy to clipboard failed:', err);
    }
    return false;
  }

  // Triggers a browser download of the given blob without leaving the page.
  function downloadImage(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke slightly later so the download has time to start.
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // reason: 'downloaded-copied' (saved + on clipboard), 'downloaded' (saved only),
  // or 'screenshot' (image couldn't be generated at all).
  var SHARE_FALLBACK_MESSAGES = {
    'downloaded-copied': 'Your invitation image has been saved to your device and copied to your clipboard. Paste it (Ctrl/Cmd + V) into Telegram, Teams or email, or upload the saved file to Facebook, Instagram — anywhere you like.',
    'downloaded': 'Your invitation image has been saved to your device. You can now share it to Facebook, Instagram, Telegram, Teams, email — anywhere you like.',
    'screenshot': 'We could not generate the image automatically. Please take a screenshot of this page and share it to your story.'
  };

  function showShareFallback(reason) {
    var message = document.getElementById('share-modal-message');
    if (message) {
      message.textContent = SHARE_FALLBACK_MESSAGES[reason] || SHARE_FALLBACK_MESSAGES.screenshot;
    }
    document.getElementById('share-modal').classList.add('visible');
  }

  /* ---------- Init ---------- */

  document.title = EVENT_TITLE;
  loadState();
  hydrateFormFromState();
  updateSubmitButtonState();
})();
