"use strict";
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// formsubmit.co takes a few seconds to redirect to thanks.html; show that the
// submit registered so it isn't pressed twice.
const form = document.getElementById("contact-form");
if (form) {
  form.addEventListener("submit", () => {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Sending…";
    document.getElementById("form-note").textContent =
      "Sending your message. You'll land on a confirmation page when it's through.";
  });
  // Back/forward cache can restore the page with the button still disabled.
  const note = document.getElementById("form-note").textContent;
  window.addEventListener("pageshow", () => {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = false;
    button.textContent = "Send message";
    document.getElementById("form-note").textContent = note;
  });
}
