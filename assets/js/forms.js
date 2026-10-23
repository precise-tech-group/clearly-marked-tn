(function () {
  "use strict";

  var form = document.querySelector("[data-contact-form]");
  if (!form) return;

  var card = document.querySelector("[data-form-card]");
  var success = card ? card.querySelector(".form-success") : null;
  var resetBtn = card ? card.querySelector("[data-form-reset]") : null;
  var mailTrigger = card ? card.querySelector("[data-mail-trigger]") : null;

  var otherCheckbox = form.querySelector("[data-other-checkbox]");
  var otherDetailField = form.querySelector("[data-other-detail]");

  if (otherCheckbox && otherDetailField) {
    otherCheckbox.addEventListener("change", function () {
      otherDetailField.hidden = !otherCheckbox.checked;
      if (otherCheckbox.checked) {
        var input = otherDetailField.querySelector("input");
        if (input) input.focus();
      }
    });
  }

  function fieldWrap(el) {
    return el.closest(".form-field") || el.closest("fieldset.form-field");
  }

  function setError(el, message) {
    var wrap = fieldWrap(el);
    if (!wrap) return;
    var errorEl = wrap.querySelector(".form-error");
    if (message) {
      wrap.classList.add("has-error");
      if (errorEl) errorEl.textContent = message;
    } else {
      wrap.classList.remove("has-error");
      if (errorEl) errorEl.textContent = "";
    }
  }

  function validateName() {
    var el = form.querySelector("#field-name");
    if (!el.value.trim()) {
      setError(el, "Please enter your name.");
      return false;
    }
    setError(el, "");
    return true;
  }

  function validateEmail() {
    var el = form.querySelector("#field-email");
    var value = el.value.trim();
    var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setError(el, "Please enter your email address.");
      return false;
    }
    if (!pattern.test(value)) {
      setError(el, "Please enter a valid email address.");
      return false;
    }
    setError(el, "");
    return true;
  }

  function validateServices() {
    var checked = form.querySelectorAll('input[name="service"]:checked');
    var anchor = form.querySelector('input[name="service"]');
    if (checked.length === 0) {
      setError(anchor, "Please select at least one service.");
      return false;
    }
    setError(anchor, "");
    return true;
  }

  var liveFields = [
    { el: form.querySelector("#field-name"), fn: validateName },
    { el: form.querySelector("#field-email"), fn: validateEmail }
  ];

  liveFields.forEach(function (f) {
    if (!f.el) return;
    f.el.addEventListener("blur", f.fn);
    f.el.addEventListener("input", function () {
      if (fieldWrap(f.el).classList.contains("has-error")) f.fn();
    });
  });

  form.querySelectorAll('input[name="service"]').forEach(function (cb) {
    cb.addEventListener("change", validateServices);
  });

  /* Submit handling — client-side only.
     No backend is connected; this builds a pre-filled email to the
     business so the request still reaches someone, and shows the
     confirmation state. Swap for a real form backend in production. */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var nameOk = validateName();
    var emailOk = validateEmail();
    var servicesOk = validateServices();

    if (!nameOk || !emailOk || !servicesOk) {
      var firstError = form.querySelector(".has-error");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    var data = new FormData(form);
    var services = data.getAll("service").join(", ") || "Not specified";
    var otherDetail = data.get("other_detail");

    var lines = [
      "New quote request from the Clearly Marked website:",
      "",
      "Name: " + (data.get("name") || ""),
      "Email: " + (data.get("email") || ""),
      "Services requested: " + services,
      otherDetail ? "Other details: " + otherDetail : "",
      "Message: " + (data.get("message") || "None provided")
    ].filter(Boolean);

    var subject = encodeURIComponent("Quote Request — " + (data.get("name") || "New Customer"));
    var body = encodeURIComponent(lines.join("\n"));
    var mailLink = "mailto:michael@clearlymarkedtn.com?subject=" + subject + "&body=" + body;

    if (mailTrigger) {
      mailTrigger.setAttribute("href", mailLink);
    }

    if (card) {
      card.classList.add("is-submitted");
    }
    if (success) {
      success.classList.add("is-visible");
      success.setAttribute("tabindex", "-1");
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (card) card.classList.remove("is-submitted");
      if (success) success.classList.remove("is-visible");
      form.reset();
      if (otherDetailField) otherDetailField.hidden = true;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
})();
