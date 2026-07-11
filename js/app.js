(function () {
  'use strict';

  var STORAGE_KEY = 'afterworkFormData';
  var EVENT_TITLE = (window.APP_CONFIG && window.APP_CONFIG.eventTitle) || 'AFTERWORK by Heineken';

  var state = {
    name: '',
    phoneNumber: '',
    dateOfBirth: '',
    organization: '',
    bringPlusOne: '',
    plusOneName: '',
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

    var posterShell = document.querySelector('.poster-shell');
    posterShell.classList.remove('bg-landing', 'bg-body');
    posterShell.classList.add(pageNumber === 1 ? 'bg-landing' : 'bg-body');

    window.scrollTo(0, 0);
  }

  function hydrateFormFromState() {
    document.getElementById('input-name').value = state.name || '';
    document.getElementById('input-phone').value = state.phoneNumber || '';
    document.getElementById('input-dob').value = state.dateOfBirth || '';
    document.getElementById('input-org').value = state.organization || '';

    var plusOneRadios = document.querySelectorAll('input[name="plusOne"]');
    plusOneRadios.forEach(function (radio) {
      radio.checked = radio.value === state.bringPlusOne;
    });

    document.getElementById('input-plusone-name').value = state.plusOneName || '';
    document.getElementById('input-plusone-phone').value = state.plusOnePhoneNumber || '';
    document.getElementById('input-plusone-dob').value = state.plusOneDateOfBirth || '';
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
      ['input-plusone-name', 'input-plusone-phone', 'input-plusone-dob', 'input-plusone-org'].forEach(function (id) {
        var el = document.getElementById(id);
        clearFieldError(el, document.getElementById('err-' + id.replace('input-', '')));
      });
    }
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

  document.querySelectorAll('input[name="plusOne"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      togglePlusOneFields(radio.value === 'Yes' && radio.checked);
    });
  });

  document.getElementById('btn-page2-next').addEventListener('click', function () {
    var nameInput = document.getElementById('input-name');
    var phoneInput = document.getElementById('input-phone');
    var dobInput = document.getElementById('input-dob');
    var orgInput = document.getElementById('input-org');

    var errName = document.getElementById('err-name');
    var errPhone = document.getElementById('err-phone');
    var errDob = document.getElementById('err-dob');
    var errOrg = document.getElementById('err-org');
    var banner = document.getElementById('page2-validation');

    var checkedPlusOne = document.querySelector('input[name="plusOne"]:checked');
    var bringingPlusOne = checkedPlusOne && checkedPlusOne.value === 'Yes';

    var plusOneNameInput = document.getElementById('input-plusone-name');
    var plusOnePhoneInput = document.getElementById('input-plusone-phone');
    var plusOneDobInput = document.getElementById('input-plusone-dob');
    var plusOneOrgInput = document.getElementById('input-plusone-org');

    var errPlusOneName = document.getElementById('err-plusone-name');
    var errPlusOnePhone = document.getElementById('err-plusone-phone');
    var errPlusOneDob = document.getElementById('err-plusone-dob');
    var errPlusOneOrg = document.getElementById('err-plusone-org');

    var isValid = true;

    [
      [nameInput, errName],
      [phoneInput, errPhone],
      [dobInput, errDob],
      [orgInput, errOrg],
      [plusOneNameInput, errPlusOneName],
      [plusOnePhoneInput, errPlusOnePhone],
      [plusOneDobInput, errPlusOneDob],
      [plusOneOrgInput, errPlusOneOrg]
    ].forEach(function (pair) {
      clearFieldError(pair[0], pair[1]);
    });

    if (!nameInput.value.trim()) {
      showFieldError(nameInput, errName);
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

    if (!dobInput.value.trim()) {
      showFieldError(dobInput, errDob);
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

      var plusOnePhoneValue = plusOnePhoneInput.value.trim();
      if (!plusOnePhoneValue) {
        errPlusOnePhone.textContent = "Plus One's Phone Number is required.";
        showFieldError(plusOnePhoneInput, errPlusOnePhone);
        isValid = false;
      } else if (!isValidPhone(plusOnePhoneValue)) {
        errPlusOnePhone.textContent = 'Please enter a valid phone number (numbers only).';
        showFieldError(plusOnePhoneInput, errPlusOnePhone);
        isValid = false;
      }

      if (!plusOneDobInput.value.trim()) {
        showFieldError(plusOneDobInput, errPlusOneDob);
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
    state.phoneNumber = phoneInput.value.trim();
    state.dateOfBirth = dobInput.value.trim();
    state.organization = orgInput.value.trim();
    state.bringPlusOne = checkedPlusOne ? checkedPlusOne.value : '';

    if (bringingPlusOne) {
      state.plusOneName = plusOneNameInput.value.trim();
      state.plusOnePhoneNumber = plusOnePhoneInput.value.trim();
      state.plusOneDateOfBirth = plusOneDobInput.value.trim();
      state.plusOneOrganization = plusOneOrgInput.value.trim();
    } else {
      state.plusOneName = '';
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

  function lockTermsCheckbox() {
    hasViewedTerms = false;
    termsCheckbox.disabled = true;
    termsCheckbox.checked = false;
    termsBlock.classList.add('is-locked');
    termsHint.classList.remove('hidden');
    updateSubmitButtonState();
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
    var originalLabel = submitButton.textContent;
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
      submitButton.textContent = originalLabel;
      updateSubmitButtonState();
    }
  }

  /* ---------- Page 4 ---------- */

  document.getElementById('btn-page4-back').addEventListener('click', function () {
    goToPage(3);
  });

  var termsPageCheckbox = document.getElementById('terms-page-checkbox');

  termsPageCheckbox.addEventListener('change', function () {
    if (termsPageCheckbox.checked) {
      unlockTermsCheckbox();
      goToPage(3);
    } else {
      lockTermsCheckbox();
    }
  });

  /* ---------- Page 5 ---------- */

  document.getElementById('btn-share').addEventListener('click', function () {
    shareToStory();
  });

  document.getElementById('btn-modal-close').addEventListener('click', function () {
    document.getElementById('share-modal').classList.remove('visible');
  });

  function shareToStory() {
    var shareText = "I'm officially on the A-list for Afterwork by Heineken.";
    var shareUrl = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: 'AFTERWORK by Heineken',
        text: shareText,
        url: shareUrl
      }).catch(function () {
        showShareFallback();
      });
    } else {
      showShareFallback();
    }
  }

  function showShareFallback() {
    document.getElementById('share-modal').classList.add('visible');
  }

  /* ---------- Init ---------- */

  document.title = EVENT_TITLE;
  loadState();
  hydrateFormFromState();
  updateSubmitButtonState();
  document.querySelector('.poster-shell').classList.add('bg-landing');
})();
