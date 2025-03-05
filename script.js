document.addEventListener("DOMContentLoaded", function () {
  // Adjust header size on scroll
  window.addEventListener("scroll", adjustHeaderSize);

  // Fade-in sections on scroll
  const sections = document.querySelectorAll("section");
  window.addEventListener("scroll", fadeInOnScroll);

  function fadeInOnScroll() {
    const triggerBottom = window.innerHeight * 0.85;
    sections.forEach((section) => {
      const sectionTop = section.getBoundingClientRect().top;
      if (sectionTop < triggerBottom) {
        section.classList.add("visible");
      }
    });
  }

  // Ensure we run once on load to handle any sections in initial view
  fadeInOnScroll();
});

function adjustHeaderSize() {
  const header = document.querySelector("header");
  const profilePicture = document.querySelector(".profile-picture");
  const scrollTop = window.scrollY;
  const headerFullHeight = 60; // vh
  const headerShrunkHeight = 20; // vh

  if (scrollTop > window.innerHeight * (headerFullHeight / 100)) {
    header.style.height = `${headerShrunkHeight}vh`;
    profilePicture.style.width = "80px";
    profilePicture.style.height = "80px";
    // push the main content below the new 20vh header
    document.querySelector("main").style.marginTop = `${headerShrunkHeight}vh`;
  } else {
    header.style.height = `${headerFullHeight}vh`;
    profilePicture.style.width = "150px";
    profilePicture.style.height = "150px";
    document.querySelector("main").style.marginTop = `${headerFullHeight}vh`;
  }
}
